import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import { StripeEventHandler } from '@/lib/services/stripeEventHandler';
import Stripe from 'stripe';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  date: string;
  dueDate: string;
  description: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  stripeInvoiceId: string;
  stripeSessionId: string;
  paymentIntentId?: string;
  hostedInvoiceUrl?: string;
  invoicePdfUrl?: string;
  isFailedPayment?: boolean;
  failedDetails?: {
    invoiceId?: string;
    failedAt?: string;
    reason?: string;
    attemptCount?: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const email = searchParams.get('email');
    
    // Si siteId est fourni, c'est un appel admin (pas besoin de token utilisateur)
    if (siteId) {
      // Connexion à la base de données
      await connectToDatabase();

      // Récupérer les clés Stripe depuis la base de données
      // Forcer le mode test si on est sur localhost
      const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1');
      const stripeKeys = await getStripeKeysFromDatabase(siteId);
      
      // Forcer le mode test si on est sur localhost
      if (isLocalhost && stripeKeys.testSecretKey) {
        stripeKeys.stripeSecretKey = stripeKeys.testSecretKey;
        stripeKeys.isTestMode = true;
      }
      
      if (!stripeKeys.stripeSecretKey) {
        return NextResponse.json(
          { error: "Configuration Stripe non trouvée pour ce site" },
          { status: 500 }
        );
      }

      // Initialiser Stripe avec la clé trouvée
      const stripe = new Stripe(stripeKeys.stripeSecretKey, { apiVersion: '2025-08-27.basil' });
      
      let invoices: Invoice[] = [];
      let totalAmount = 0;
      let paidInvoices = 0;
      let pendingInvoices = 0;

      if (email) {
        // Recherche par email spécifique
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        });

        if (customers.data.length > 0) {
          const customer = customers.data[0];
          const stripeInvoices = await stripe.invoices.list({
            customer: customer.id,
            limit: 100,
            expand: ['data.payment_intent']
          });

          invoices = stripeInvoices.data.map((invoice) => {
            const lineItem = invoice.lines?.data[0];
            const paymentIntent = (invoice as any).payment_intent;
            
            let productName = 'Service';
            if (lineItem) {
              productName = lineItem.description || productName;
            }

            const amount = invoice.amount_paid / 100;
            const status = invoice.status as 'paid' | 'pending' | 'overdue' | 'cancelled';
            
            return {
              id: invoice.id || `invoice_${Date.now()}`,
              invoiceNumber: invoice.number || invoice.id || `FAC-${Date.now()}`,
              amount: Math.round(amount * 100), // Convertir en centimes pour la cohérence
              currency: invoice.currency,
              status: status,
              date: new Date(invoice.created * 1000).toISOString(),
              dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : (() => {
                // Si pas de due_date, calculer selon le type de facture
                const createdDate = new Date(invoice.created * 1000);
                const lineItem = invoice.lines?.data[0];
                let monthsToAdd = 1; // Par défaut mensuel
                
                if (lineItem?.description) {
                  const desc = lineItem.description.toLowerCase();
                  if (desc.includes('every 3 months') || desc.includes('trimestriel')) {
                    monthsToAdd = 3;
                  } else if (desc.includes('every 6 months') || desc.includes('semestriel')) {
                    monthsToAdd = 6;
                  } else if (desc.includes('every 12 months') || desc.includes('annuel')) {
                    monthsToAdd = 12;
                  } else if (desc.includes('every 2 months') || desc.includes('bimestriel')) {
                    monthsToAdd = 2;
                  }
                }
                
                const dueDate = new Date(createdDate);
                dueDate.setMonth(dueDate.getMonth() + monthsToAdd);
                return dueDate.toISOString();
              })(),
              description: productName,
              customerName: customer.name || customer.email || 'Client',
              customerEmail: customer.email || '',
              items: [{
                id: lineItem?.id || '1',
                description: productName,
                quantity: lineItem?.quantity || 1,
                unitPrice: Math.round((lineItem as any)?.unit_amount || 0),
                total: Math.round(amount * 100)
              }],
              stripeInvoiceId: invoice.id || '',
              stripeSessionId: paymentIntent?.metadata?.session_id || '',
              paymentIntentId: paymentIntent?.id,
              hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
              invoicePdfUrl: invoice.invoice_pdf || undefined
            };
          });

          totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
          paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
          pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
        }
      } else {
        // Récupérer toutes les factures du site (limitées pour éviter la surcharge)
        const allInvoices = await stripe.invoices.list({
          limit: 50,
          expand: ['data.payment_intent', 'data.customer']
        });

        invoices = allInvoices.data.map((invoice) => {
          const lineItem = invoice.lines?.data[0];
          const paymentIntent = (invoice as any).payment_intent;
          const customer = (invoice as any).customer;
          
          let productName = 'Service';
          if (lineItem) {
            productName = lineItem.description || productName;
          }

          const amount = invoice.amount_paid / 100;
          const status = invoice.status as 'paid' | 'pending' | 'overdue' | 'cancelled';
          
          return {
            id: invoice.id || `invoice_${Date.now()}`,
            invoiceNumber: invoice.number || invoice.id || `FAC-${Date.now()}`,
            amount: Math.round(amount * 100),
            currency: invoice.currency,
            status: status,
            date: new Date(invoice.created * 1000).toISOString(),
            dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : (() => {
              // Si pas de due_date, calculer selon le type de facture
              const createdDate = new Date(invoice.created * 1000);
              const lineItem = invoice.lines?.data[0];
              let monthsToAdd = 1; // Par défaut mensuel
              
              if (lineItem?.description) {
                const desc = lineItem.description.toLowerCase();
                if (desc.includes('every 3 months') || desc.includes('trimestriel')) {
                  monthsToAdd = 3;
                } else if (desc.includes('every 6 months') || desc.includes('semestriel')) {
                  monthsToAdd = 6;
                } else if (desc.includes('every 12 months') || desc.includes('annuel')) {
                  monthsToAdd = 12;
                } else if (desc.includes('every 2 months') || desc.includes('bimestriel')) {
                  monthsToAdd = 2;
                }
              }
              
              const dueDate = new Date(createdDate);
              dueDate.setMonth(dueDate.getMonth() + monthsToAdd);
              return dueDate.toISOString();
            })(),
            description: productName,
            customerName: customer?.name || customer?.email || 'Client',
            customerEmail: customer?.email || '',
            items: [{
              id: lineItem?.id || '1',
              description: productName,
              quantity: lineItem?.quantity || 1,
              unitPrice: Math.round(((lineItem as any)?.unit_amount || 0) / 100),
              total: Math.round(amount * 100)
            }],
            stripeInvoiceId: invoice.id || '',
            stripeSessionId: paymentIntent?.metadata?.session_id || '',
            paymentIntentId: paymentIntent?.id,
            hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
            invoicePdfUrl: invoice.invoice_pdf || undefined
          };
        });

        totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
        pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
      }

      return NextResponse.json({
        success: true,
        invoices,
        stats: {
          total: invoices.length,
          totalAmount,
          paid: paidInvoices,
          pending: pendingInvoices
        }
      });
    }

    // Code existant pour les utilisateurs authentifiés
    // Récupérer le token depuis le cookie HTTP-only pour les Utilisateurs
    const token = req.cookies.get("utilisateur_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Non autorisé - Token utilisateur manquant" },
        { status: 401 }
      );
    }

    // Vérifier et décoder le JWT
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { error: "Token utilisateur invalide ou expiré" },
        { status: 401 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer l'utilisateur depuis la base de données
    const user = await Utilisateur
      .findById(payload.userId)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Récupérer les clés Stripe depuis la base de données
    // Forcer le mode test si on est sur localhost
    const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1');
    const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
    
    // Forcer le mode test si on est sur localhost
    if (isLocalhost && stripeKeys.testSecretKey) {
      stripeKeys.stripeSecretKey = stripeKeys.testSecretKey;
      stripeKeys.isTestMode = true;
    }
    
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json(
        { error: "Configuration Stripe non trouvée pour ce site" },
        { status: 500 }
      );
    }

    // Initialiser Stripe avec la clé trouvée
    const stripe = new Stripe(stripeKeys.stripeSecretKey, { apiVersion: '2025-08-27.basil' });

    let invoices: Invoice[] = [];
    let totalAmount = 0;
    let paidInvoices = 0;
    let pendingInvoices = 0;

    // Utiliser directement le stripeCustomerId s'il existe, sinon chercher par email
    let customerId: string | null = null;
    
    if (user.stripeCustomerId) {
      // Utiliser directement le stripeCustomerId stocké dans la base de données
      customerId = user.stripeCustomerId;
      console.log(`Utilisation du stripeCustomerId stocké: ${customerId}`);
    } else {
      // Fallback: chercher par email si pas de stripeCustomerId
      console.log(`Aucun stripeCustomerId stocké, recherche par email: ${user.email}`);
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`Customer trouvé par email: ${customerId}`);
      }
    }

    if (customerId) {
      // Lister toutes les factures associées à ce client
      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        status: 'paid',
        limit: 100,
        expand: ['data.payment_intent']
      });


      // Transformer les factures Stripe en format personnalisé
      invoices = stripeInvoices.data.map((invoice) => {
        const lineItem = invoice.lines?.data[0];
        const paymentIntent = (invoice as any).payment_intent;
        
        // Récupérer le nom du produit depuis Stripe
        let productName = 'Service';
        
        if (lineItem) {
          // Le nom du produit est disponible dans lineItem.description
          productName = lineItem.description || productName;
        }

        const amount = invoice.amount_paid / 100; // Stripe stocke les montants en centimes
        totalAmount += amount;

        if (invoice.status === 'paid') {
          paidInvoices++;
        } else if (invoice.status === 'open') {
          pendingInvoices++;
        }

        return {
          id: invoice.id || `invoice_${Date.now()}`,
          invoiceNumber: invoice.number || `FAC-${invoice.id?.slice(-8) || 'unknown'}`,
          amount: amount,
          currency: invoice.currency?.toUpperCase() || 'EUR',
          status: invoice.status === 'paid' ? 'paid' : 'pending',
          date: new Date(invoice.created * 1000).toISOString(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : (() => {
            // Si pas de due_date, calculer selon le type de facture
            const createdDate = new Date(invoice.created * 1000);
            const lineItem = invoice.lines?.data[0];
            let monthsToAdd = 1; // Par défaut mensuel
            
            if (lineItem?.description) {
              const desc = lineItem.description.toLowerCase();
              if (desc.includes('every 3 months') || desc.includes('trimestriel')) {
                monthsToAdd = 3;
              } else if (desc.includes('every 6 months') || desc.includes('semestriel')) {
                monthsToAdd = 6;
              } else if (desc.includes('every 12 months') || desc.includes('annuel')) {
                monthsToAdd = 12;
              } else if (desc.includes('every 2 months') || desc.includes('bimestriel')) {
                monthsToAdd = 2;
              }
            }
            
            const dueDate = new Date(createdDate);
            dueDate.setMonth(dueDate.getMonth() + monthsToAdd);
            return dueDate.toISOString();
          })(),
          description: productName,
          customerName: invoice.customer_name || `${user.firstName} ${user.lastName}`,
          customerEmail: invoice.customer_email || user.email,
          items: [
            {
              id: lineItem?.id || '1',
              description: productName,
              quantity: lineItem?.quantity || 1,
              unitPrice: (lineItem as any)?.unit_amount ? (lineItem as any).unit_amount : Math.round(amount * 100),
              total: Math.round(amount * 100)
            }
          ],
          stripeInvoiceId: invoice.id || '',
          stripeSessionId: paymentIntent?.metadata?.session_id || '',
          paymentIntentId: paymentIntent?.id,
          // Liens Stripe pour télécharger et voir la facture
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          invoicePdfUrl: invoice.invoice_pdf || undefined
        };
      });
    } else {
      console.log(`Aucun customer Stripe trouvé pour l'utilisateur: ${user.email} (stripeCustomerId: ${user.stripeCustomerId || 'non défini'})`);
    }

    // Récupérer les impayés de l'utilisateur
    let failedPaymentsAsInvoices: Invoice[] = [];
    try {
      const failedStats = await StripeEventHandler.getFailedPaymentsStats(user._id.toString());
      if (failedStats && failedStats.failedPayments && failedStats.failedPayments.length > 0) {
        failedPaymentsAsInvoices = failedStats.failedPayments.map((fp: any) => {
          // Normaliser les données (gérer le cas où les données sont dans _doc)
          const source = fp && typeof fp === 'object' && fp._doc ? fp._doc : fp;
          
          const amountValue = source?.amount ?? fp?.amount ?? 0;
          const rawAmount = typeof amountValue === 'number' ? amountValue : Number(amountValue);
          const invoiceRaw = source?.invoiceId ?? fp?.invoiceId ?? '';
          const invoiceId = invoiceRaw ? invoiceRaw.toString() : '';
          const currencyRaw = source?.currency ?? fp?.currency ?? 'eur';
          const currency = currencyRaw ? currencyRaw.toString().toUpperCase() : 'EUR';
          const attemptRaw = source?.attemptCount ?? fp?.attemptCount ?? 1;
          const attemptCount = typeof attemptRaw === 'number' ? attemptRaw : Number(attemptRaw) || 1;
          const reason = source?.reason ?? fp?.reason ?? 'Paiement refusé';
          const failedAtRaw = source?.failedAt ?? fp?.failedAt;
          const failedAt = failedAtRaw ? new Date(failedAtRaw) : new Date();

          return {
            id: `failed-${invoiceId || user._id}`,
            invoiceNumber: invoiceId || `IMP-${Date.now()}`,
            amount: rawAmount / 100,
            currency,
            status: 'overdue' as const,
            date: failedAt.toISOString(),
            dueDate: failedAt.toISOString(),
            description: `Paiement échoué - ${reason}`,
            customerName: failedStats.userName || `${user.firstName} ${user.lastName}`,
            customerEmail: failedStats.userEmail || user.email,
            items: [{
              id: '1',
              description: `Paiement échoué - ${reason}`,
              quantity: 1,
              unitPrice: rawAmount / 100,
              total: rawAmount / 100
            }],
            stripeInvoiceId: invoiceId,
            stripeSessionId: '',
            paymentIntentId: undefined,
            hostedInvoiceUrl: undefined,
            invoicePdfUrl: undefined,
            isFailedPayment: true,
            failedDetails: {
              invoiceId,
              failedAt: failedAtRaw,
              reason,
              attemptCount,
            },
          };
        });
      }
    } catch (failedError) {
      console.warn('Impossible de récupérer les impayés pour l\'utilisateur:', failedError);
    }

    const allInvoices = [...invoices, ...failedPaymentsAsInvoices];

    // Calculer les statistiques
    const totalInvoices = allInvoices.length;
    const failedAmount = failedPaymentsAsInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return NextResponse.json({
      invoices: allInvoices,
      stats: {
        total: totalInvoices,
        totalAmount: Math.round((totalAmount + failedAmount) * 100) / 100,
        paid: paidInvoices,
        pending: pendingInvoices,
        failed: failedPaymentsAsInvoices.length
      }
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des factures:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 