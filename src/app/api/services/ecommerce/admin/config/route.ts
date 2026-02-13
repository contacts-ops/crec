import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { sharedServices } from "@/_sharedServices"
import Stripe from "stripe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/services/ecommerce/admin/config - Get e-commerce Stripe configuration
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    let siteId = extractSiteId(request)
    const { searchParams } = new URL(request.url)
    if (!siteId && searchParams.get("siteId")) {
      siteId = searchParams.get("siteId")
    }

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "siteId est requis" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const site = await Site.findOne({ siteId }).lean()

    if (!site) {
      return NextResponse.json(
        { success: false, error: "Site non trouvé" },
        { status: 404 }
      )
    }

    const ecommerceConfig = (site.ecommerce || {}) as any

    // Return config without exposing secret keys (only show if configured)
    return NextResponse.json({
      success: true,
      config: {
        environment: ecommerceConfig.environment || "development",
        isConfigured: ecommerceConfig.isConfigured || false,
        hasTestKeys: !!(ecommerceConfig.testPublicKey && ecommerceConfig.testSecretKey),
        hasLiveKeys: !!(ecommerceConfig.livePublicKey && ecommerceConfig.liveSecretKey),
        // Don't return actual keys for security
        testPublicKey: ecommerceConfig.testPublicKey ? "***configured***" : undefined,
        livePublicKey: ecommerceConfig.livePublicKey ? "***configured***" : undefined,
        priceMode: ecommerceConfig.priceMode || "HT",
        vatRate: typeof ecommerceConfig.vatRate === "number" ? ecommerceConfig.vatRate : 0.2,
      },
    })
  } catch (error: any) {
    console.error("[ecommerce] Error getting config:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la récupération de la configuration" },
      { status: 500 }
    )
  }
}

// POST /api/services/ecommerce/admin/config - Save e-commerce Stripe configuration
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      siteId: bodySiteId,
      environment,
      testPublicKey,
      testSecretKey,
      livePublicKey,
      liveSecretKey,
      webhookSecret, // Legacy support
      testWebhookSecret,
      liveWebhookSecret,
      priceMode,
      vatRate,
    } = body

    let siteId = extractSiteId(request)
    if (!siteId && bodySiteId) {
      siteId = bodySiteId
    }

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "siteId est requis" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const site = await Site.findOne({ siteId })

    if (!site) {
      return NextResponse.json(
        { success: false, error: "Site non trouvé" },
        { status: 404 }
      )
    }

    // Validate Stripe keys if provided
    const keysToValidate: { key: string; name: string }[] = []

    if (environment === "development") {
      if (testSecretKey) {
        keysToValidate.push({ key: testSecretKey, name: "testSecretKey" })
      }
    } else {
      if (liveSecretKey) {
        keysToValidate.push({ key: liveSecretKey, name: "liveSecretKey" })
      }
    }

    // Validate Stripe keys by testing connection
    for (const { key, name } of keysToValidate) {
      try {
        const testStripe = new Stripe(key, {
          apiVersion: "2025-08-27.basil",
        })
        // Test the key by retrieving account info
        await testStripe.accounts.retrieve()
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Clé Stripe invalide (${name}): ${error.message || "Impossible de se connecter à Stripe"}`,
          },
          { status: 400 }
        )
      }
    }

    // Get existing e-commerce config to preserve values not being updated
    const existingConfig = (site.ecommerce || {}) as any

    // Price mode and VAT (optional in request; preserve existing if not sent)
    if (priceMode !== undefined && (priceMode === "HT" || priceMode === "TTC")) {
      existingConfig.priceMode = priceMode
    } else if (existingConfig.priceMode === undefined) {
      existingConfig.priceMode = "HT"
    }
    if (vatRate !== undefined && typeof vatRate === "number" && vatRate >= 0 && vatRate <= 1) {
      existingConfig.vatRate = vatRate
    } else if (existingConfig.vatRate === undefined) {
      existingConfig.vatRate = 0.2
    }

    const isPriceOnlyUpdate = environment === undefined || environment === null
    const resolvedEnvironment = (environment && ["development", "production"].includes(environment))
      ? environment
      : (existingConfig.environment || "development")

    if (!isPriceOnlyUpdate && !["development", "production"].includes(resolvedEnvironment)) {
      return NextResponse.json(
        { success: false, error: "Environnement invalide. Utilisez 'development' ou 'production'" },
        { status: 400 }
      )
    }

    // Prepare e-commerce config - start with existing values to preserve them
    // But exclude legacy webhookSecret - we'll migrate it to environment-specific field
    const ecommerceConfig: any = {
      ...existingConfig, // Preserve existing config
      environment: resolvedEnvironment,
      isConfigured: isPriceOnlyUpdate ? existingConfig.isConfigured : false,
    }
    // Remove legacy webhookSecret from the config object - we'll migrate it below
    if (ecommerceConfig.webhookSecret) {
      delete ecommerceConfig.webhookSecret
    }

    // Set keys based on environment (skip when only updating price settings)
    if (!isPriceOnlyUpdate && resolvedEnvironment) {
      if (resolvedEnvironment === "development") {
        if (testPublicKey) ecommerceConfig.testPublicKey = testPublicKey
        if (testSecretKey) ecommerceConfig.testSecretKey = testSecretKey
        // Set test webhook secret if provided
        if (testWebhookSecret) {
          ecommerceConfig.testWebhookSecret = testWebhookSecret
        } else if (webhookSecret) {
          ecommerceConfig.testWebhookSecret = webhookSecret
        }
        if (!testWebhookSecret && !webhookSecret && existingConfig.testWebhookSecret) {
          ecommerceConfig.testWebhookSecret = existingConfig.testWebhookSecret
        }
        if (!ecommerceConfig.testWebhookSecret && existingConfig.webhookSecret) {
          console.log(`[ecommerce/admin/config] Migrating legacy webhookSecret to testWebhookSecret for siteId: ${siteId}`)
          ecommerceConfig.testWebhookSecret = existingConfig.webhookSecret
        }
        ecommerceConfig.isConfigured = !!(
          (ecommerceConfig.testPublicKey || existingConfig.testPublicKey) &&
          (ecommerceConfig.testSecretKey || existingConfig.testSecretKey)
        )
      } else {
        if (livePublicKey) ecommerceConfig.livePublicKey = livePublicKey
        if (liveSecretKey) ecommerceConfig.liveSecretKey = liveSecretKey
        if (liveWebhookSecret) {
          ecommerceConfig.liveWebhookSecret = liveWebhookSecret
        } else if (webhookSecret) {
          ecommerceConfig.liveWebhookSecret = webhookSecret
        }
        if (!liveWebhookSecret && !webhookSecret && existingConfig.liveWebhookSecret) {
          ecommerceConfig.liveWebhookSecret = existingConfig.liveWebhookSecret
        }
        if (!ecommerceConfig.liveWebhookSecret && existingConfig.webhookSecret) {
          console.log(`[ecommerce/admin/config] Migrating legacy webhookSecret to liveWebhookSecret for siteId: ${siteId}`)
          ecommerceConfig.liveWebhookSecret = existingConfig.webhookSecret
        }
        ecommerceConfig.isConfigured = !!(
          (ecommerceConfig.livePublicKey || existingConfig.livePublicKey) &&
          (ecommerceConfig.liveSecretKey || existingConfig.liveSecretKey)
        )
      }
    }

    // Ensure webhookSecret is removed from the config object (we've already migrated it)
    // Since we're using $set on the entire ecommerce object, we don't need $unset
    // Just make sure webhookSecret is not in the object
    if (ecommerceConfig.webhookSecret) {
      delete ecommerceConfig.webhookSecret
    }
    
    // Debug logging before save
    console.log(`[ecommerce/admin/config] Saving config for siteId: ${siteId}, environment: ${environment}`)
    console.log(`[ecommerce/admin/config] Webhook secrets in request - testWebhookSecret: ${!!testWebhookSecret}, liveWebhookSecret: ${!!liveWebhookSecret}, webhookSecret: ${!!webhookSecret}`)
    console.log(`[ecommerce/admin/config] Webhook secrets in config - test: ${!!ecommerceConfig.testWebhookSecret}, live: ${!!ecommerceConfig.liveWebhookSecret}, legacy: ${!!existingConfig.webhookSecret}`)
    console.log(`[ecommerce/admin/config] testWebhookSecret length: ${ecommerceConfig.testWebhookSecret?.length || 0}`)
    
    // Update site with e-commerce config
    const updatedSite = await Site.findOneAndUpdate(
      { siteId },
      { $set: { ecommerce: ecommerceConfig, lastUpdated: new Date() } },
      { new: true }
    )
    
    // Verify what was actually saved
    if (updatedSite) {
      const savedConfig = (updatedSite.ecommerce || {}) as any
      console.log(`[ecommerce/admin/config] Saved config verified - testWebhookSecret: ${!!savedConfig.testWebhookSecret}, length: ${savedConfig.testWebhookSecret?.length || 0}`)
      console.log(`[ecommerce/admin/config] Saved config verified - liveWebhookSecret: ${!!savedConfig.liveWebhookSecret}, length: ${savedConfig.liveWebhookSecret?.length || 0}`)
    }

    return NextResponse.json({
      success: true,
      message: "Configuration e-commerce sauvegardée avec succès",
      config: {
        environment: ecommerceConfig.environment,
        isConfigured: ecommerceConfig.isConfigured,
      },
    })
  } catch (error: any) {
    console.error("[ecommerce] Error saving config:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la sauvegarde de la configuration" },
      { status: 500 }
    )
  }
}

