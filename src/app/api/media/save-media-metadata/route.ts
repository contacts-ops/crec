import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Media } from "@/lib/models/Media"
import { Site } from "@/lib/models/Site"
import { Page } from "@/lib/models/Page"
import { isVideoFile } from "@/lib/s3"

export async function POST(request: Request) {
  try {
    const { mediaUrl, fileName, fileSize, mimeType, componentId, fieldId, siteId, pageId, title, description } =
      await request.json()

    if (!mediaUrl || !componentId || !fieldId || !siteId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await connectToDatabase()

    const isVideo = isVideoFile(fileName)

    // get site info
    const site = await Site.findOne({ siteId })
    if (!site) {
      console.warn("⚠️ Site not found for media recording")
    }

    // get page info if pageId provided
    let pageName = undefined
    if (pageId) {
      const page = await Page.findOne({ pageId })
      if (page) {
        pageName = page.name
      }
    }

    // Get component info
    let componentName = componentId
    let componentType = "unknown"

    try {
      const fs = await import("fs/promises")
      const path = await import("path")
      const configPath = path.join(process.cwd(), "src", "_sharedComponents", componentId, "config.json")
      const configContent = await fs.readFile(configPath, "utf-8")
      const config = JSON.parse(configContent)
      componentName = config.name || componentId
      componentType = config.type || "unknown"
    } catch (error) {
      console.warn("⚠️ Unable to read component config:", error)
    }

    // get next position
    let nextPosition = 0
    try {
      const last = await Media.find({ siteId, componentId }).sort({ position: -1 }).limit(1).lean()
      nextPosition = (last?.[0]?.position ?? -1) + 1
    } catch (_) {
      nextPosition = 0
    }

    // Create media data
    const mediaData = {
      siteId,
      pageId: pageId || undefined,
      componentId,
      componentName,
      componentType,
      pageName,
      mediaUrl,
      mediaType: isVideo ? "video" : "image",
      fileName,
      fileSize,
      mimeType,
      fieldId,
      title: title || undefined,
      description: description || undefined,
      isActive: true,
      position: nextPosition,
    }

    // Check if media already exists for this component and field
    const existingMedia = await Media.findOne({
      siteId,
      componentId,
      fieldId,
    })

    if (existingMedia) {
      await Media.findByIdAndUpdate(existingMedia._id, {
        ...mediaData,
        updatedAt: new Date(),
      })
      console.log("✅ Media updated in database")
    } else {
      await Media.create(mediaData)
      console.log("✅ New media recorded in database")
    }

    // update component props
    try {
      const fieldParts = fieldId.split("-")

      if (fieldParts.length >= 3) {
        const [componentPrefix, serviceId, property] = fieldParts

        const page = await Page.findOne({
          siteId,
          "components.id": { $regex: componentId, $options: "i" },
        })

        if (page) {
          const componentIndex = page.components.findIndex(
            (comp) =>
              comp.id.toLowerCase().includes(componentId.toLowerCase()) ||
              comp.originalId?.toLowerCase() === componentId.toLowerCase(),
          )

          if (componentIndex !== -1) {
            const component = page.components[componentIndex]
            const props = component.props || {}
            const updatedProps = JSON.parse(JSON.stringify(props))

            if (updatedProps[componentPrefix] && Array.isArray(updatedProps[componentPrefix])) {
              const serviceIndex = updatedProps[componentPrefix].findIndex((s: any) => s.id === serviceId)
              if (serviceIndex !== -1) {
                updatedProps[componentPrefix][serviceIndex][property] = mediaUrl

                page.components[componentIndex].props = updatedProps
                page.lastUpdated = new Date()
                await page.save()
                console.log("✅ Component props updated successfully")
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error updating component props:", error)
    }

    return NextResponse.json({
      success: true,
      mediaUrl,
      mediaType: isVideo ? "video" : "image",
    })
  } catch (error) {
    console.error("❌ Error saving media metadata:", error)
    return NextResponse.json({ error: "Error saving media metadata" }, { status: 500 })
  }
}
