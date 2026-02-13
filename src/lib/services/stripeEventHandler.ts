import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur, IFailedPayment } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import { emailService } from '@/_sharedServices/emailService';

/**
 * Service pour gérer les événements Stripe de manière centralisée
 */
export class StripeEventHandler {
  
  /**
   * Obtenir une instance Stripe configurée pour un site
   */
  private static async getStripeInstance(siteId: string): Promise<Stripe> {
    const stripeKeys = await getStripeKeysFromDatabase(siteId);
    
    if (!stripeKeys.stripeSecretKey) {
      throw new Error(`Configuration Stripe non trouvée pour le site ${siteId}`);
    }
    
    return new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  
  /**
   * Traiter un événement Stripe de manière générique
   */
  static async handleEvent(event: Stripe.Event) {
    console.log(`📨 Traitement de l'événement: ${event.type}`);
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;
        
        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;
        
        default:
          console.log(`ℹ️ Événement non géré: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de l'événement ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * checkout.session.completed: rattacher le paiement à l'utilisateur (existant ou nouveau),
   * associer le customerId Stripe, mettre à jour le formulaire si fourni, et envoyer les emails.
   */
  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ checkout.session.completed reçu:', {
      id: session.id,
      customer: session.customer,
      mode: session.mode,
      status: (session as any).status,
    });
    console.log('🔍 DEBUG - Session metadata:', session.metadata);

    const metadata = (session.metadata || {}) as Record<string, string | undefined>;
    const siteId = (metadata.siteId || '') as string;
    const formId = (metadata.formId || '') as string;

    if (!siteId || !formId) {
      console.warn('⚠️ checkout.session.completed: missing critical metadata', {
        siteId,
        formId,
        sessionId: session.id,
      });
    }
    const internalUserId = (metadata.internal_user_id || '') as string;
    const newUserEmail = (metadata.new_user_email || '') as string;

    try {
      await connectToDatabase();
      const { Utilisateur } = await import('@/lib/models/Utilisateur');
      const customerId = (session.customer as string) || '';

      let userDoc: any = null;

      // 1) Trouver l'utilisateur prioritairement via internal_user_id
      if (internalUserId) {
        userDoc = await Utilisateur.findById(internalUserId);
      }

      // 2) Sinon via email + siteId
      if (!userDoc && newUserEmail) {
        userDoc = await Utilisateur.findOne({ email: newUserEmail, siteId });
        // Créer si inexistant (compte minimal, lien reset envoyé déjà côté flow si besoin)
        if (!userDoc) {
          try {
            userDoc = await Utilisateur.create({
              email: newUserEmail,
              siteId,
              role: 'user',
              status: 'active',
            });
            console.log('👤 Compte utilisateur créé via webhook pour', newUserEmail);
          } catch (e) {
            console.warn('⚠️ Création utilisateur échouée (non bloquant):', (e as Error).message);
          }
        }
      }

      if (!userDoc) {
        console.warn('⚠️ Aucun utilisateur à rattacher pour cette session (internal_user_id/new_user_email manquant)');
      } else {
        // 3) Associer le customerId Stripe
        if (customerId) {
          await Utilisateur.findByIdAndUpdate(userDoc._id, {
            $set: { stripeCustomerId: customerId }
          });
          console.log('🔗 stripeCustomerId associé à', userDoc.email);
        }
      }

      // 4) Mettre à jour le formulaire si fourni (ou via stripeSessionId en fallback)
      try {
        const { Form } = await import('@/lib/models/Form');
        if (formId) {
          console.log('🔍 DEBUG - Tentative de mise à jour du formulaire avec formId:', formId);
          const updateRes = await Form.findByIdAndUpdate(formId, {
            $set: {
              status: 'paid',
              hasPaid: true,
              stripeSessionId: session.id,
              currentStep: 3,
              updatedAt: new Date(),
            }
          });
          console.log('📝 Formulaire mis à jour (paid) via formId:', formId, 'updated:', !!updateRes);
          if (updateRes) {
            console.log('✅ Formulaire trouvé et mis à jour avec succès');
          } else {
            console.warn('⚠️ Aucun formulaire trouvé avec formId:', formId);
          }
        } else {
          console.log('🔍 DEBUG - Tentative de mise à jour du formulaire avec stripeSessionId:', session.id);
          const updateRes = await Form.findOneAndUpdate(
            { stripeSessionId: session.id },
            {
              $set: {
                status: 'paid',
                hasPaid: true,
                currentStep: 3,
                updatedAt: new Date(),
              }
            }
          );
          console.log('📝 Formulaire mis à jour (paid) via stripeSessionId:', session.id, 'updated:', !!updateRes);
          if (updateRes) {
            console.log('✅ Formulaire trouvé et mis à jour avec succès');
          } else {
            console.warn('⚠️ Aucun formulaire trouvé avec stripeSessionId:', session.id);
          }
        }
      } catch (e) {
        console.warn('⚠️ Mise à jour du formulaire échouée (non bloquant):', (e as Error).message);
      }

      // 5) Les emails seront envoyés après signature du contrat (dans le frontend)
      console.log('✅ Paiement confirmé - emails seront envoyés après signature du contrat');
    } catch (error) {
      console.error('❌ Erreur dans handleCheckoutSessionCompleted:', error);
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par son ID client Stripe
   */
  private static async getUserByStripeCustomerId(customerId: string) {
    await connectToDatabase();
    const user = await Utilisateur.findOne({ stripeCustomerId: customerId });
    
    if (!user) {
      console.log(`⚠️ Aucun utilisateur trouvé pour le client Stripe: ${customerId}`);
      return null;
    }
    
    return user;
  }

  /**
   * Récupérer les informations d'un client Stripe
   */
  private static async getCustomerInfo(customerId: string, siteId: string) {
    try {
      const stripe = await this.getStripeInstance(siteId);
      return await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du client Stripe:', error);
      throw error;
    }
  }

  /**
   * Gérer un paiement échoué
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`🚨 Paiement échoué détecté pour la facture: ${invoice.id}`);

    const customerId = invoice.customer as string;
    const user = await this.getUserByStripeCustomerId(customerId);

    if (!user) return;

    // Créer l'objet paiement échoué
    const failedPayment: IFailedPayment = {
      invoiceId: invoice.id || '',
      amount: invoice.amount_due || 0,
      currency: invoice.currency || 'eur',
      failedAt: new Date(),
      reason: invoice.last_finalization_error?.message || 'Paiement refusé',
      attemptCount: invoice.attempt_count || 1
    };

    // Ajouter le paiement échoué à l'utilisateur
    await Utilisateur.findByIdAndUpdate(
      user._id,
      { $push: { failedPayments: failedPayment } }
    );

    console.log(`✅ Paiement échoué enregistré pour l'utilisateur: ${user.email}`);

    // Envoyer une alerte par email aux administrateurs
    try {
      const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
      await emailService.sendPaymentFailedAlert(
        user.email,
        userName,
        invoice.id || '',
        invoice.amount_due || 0,
        invoice.currency || 'eur',
        invoice.last_finalization_error?.message || 'Paiement refusé',
        invoice.attempt_count || 1,
        user.siteId
      );
      console.log(`📧 Alerte paiement échoué envoyée aux administrateurs pour l'utilisateur: ${user.email}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de l'alerte email pour le paiement échoué:`, error);
      // Ne pas throw l'erreur pour ne pas bloquer le processus webhook
    }
  }

  /**
   * Gérer un paiement réussi
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log(`✅ Paiement réussi détecté pour la facture: ${invoice.id}`);
    
    const customerId = invoice.customer as string;
    const user = await this.getUserByStripeCustomerId(customerId);
    
    if (!user) return;

    // Optionnel : marquer les paiements échoués comme résolus
    // ou supprimer les paiements échoués pour cette facture
    await Utilisateur.findByIdAndUpdate(
      user._id,
      { 
        $pull: { 
          failedPayments: { invoiceId: invoice.id } 
        } 
      }
    );

    console.log(`✅ Paiement réussi traité pour l'utilisateur: ${user.email}`);
  }

  /**
   * Supprimer un impayé manuellement (ex: régularisation ou erreur)
   */
  static async removeFailedPayment(userId: string, invoiceId: string) {
    await connectToDatabase();

    if (!invoiceId) {
      throw new Error('InvoiceId requis pour supprimer un impayé');
    }

    await Utilisateur.findByIdAndUpdate(
      userId,
      {
        $pull: {
          failedPayments: {
            invoiceId,
          },
        },
      }
    );
  }

  /**
   * Gérer la création d'un abonnement
   */
  private static async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    console.log(`📦 Abonnement créé: ${subscription.id}`);
    
    const customerId = subscription.customer as string;
    const user = await this.getUserByStripeCustomerId(customerId);
    
    if (!user) return;

    // Mettre à jour l'utilisateur avec les informations d'abonnement
    await Utilisateur.findByIdAndUpdate(
      user._id,
      { 
        $set: { 
          'subscription.id': subscription.id,
          'subscription.status': subscription.status,
          'subscription.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000)
        } 
      }
    );

    console.log(`✅ Abonnement créé enregistré pour l'utilisateur: ${user.email}`);
  }

  /**
   * Gérer la mise à jour d'un abonnement
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log(`🔄 Abonnement mis à jour: ${subscription.id}`);
    
    const customerId = subscription.customer as string;
    const user = await this.getUserByStripeCustomerId(customerId);
    
    if (!user) return;

    // Mettre à jour les informations d'abonnement
    await Utilisateur.findByIdAndUpdate(
      user._id,
      { 
        $set: { 
          'subscription.status': subscription.status,
          'subscription.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000)
        } 
      }
    );

    console.log(`✅ Abonnement mis à jour pour l'utilisateur: ${user.email}`);
  }

  /**
   * Gérer la suppression d'un abonnement
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log(`🗑️ Abonnement supprimé: ${subscription.id}`);
    
    const customerId = subscription.customer as string;
    const user = await this.getUserByStripeCustomerId(customerId);
    
    if (!user) return;

    // Supprimer les informations d'abonnement
    await Utilisateur.findByIdAndUpdate(
      user._id,
      { 
        $unset: { 
          'subscription.id': 1,
          'subscription.status': 1,
          'subscription.currentPeriodEnd': 1
        } 
      }
    );

    console.log(`✅ Abonnement supprimé pour l'utilisateur: ${user.email}`);
  }

  /**
   * Gérer la création d'un client
   */
  private static async handleCustomerCreated(customer: Stripe.Customer) {
    console.log(`👤 Client créé: ${customer.id}`);
    
    // Optionnel : créer un utilisateur automatiquement
    // ou mettre à jour un utilisateur existant
  }

  /**
   * Gérer la mise à jour d'un client
   */
  private static async handleCustomerUpdated(customer: Stripe.Customer) {
    console.log(`🔄 Client mis à jour: ${customer.id}`);
    
    const user = await this.getUserByStripeCustomerId(customer.id);
    
    if (!user) return;

    // Mettre à jour les informations du client
    await Utilisateur.findByIdAndUpdate(
      user._id,
      { 
        $set: { 
          email: customer.email || user.email,
          firstName: customer.name || user.firstName
        } 
      }
    );

    console.log(`✅ Client mis à jour pour l'utilisateur: ${user.email}`);
  }

  /**
   * Récupérer les statistiques des paiements échoués pour un utilisateur
   */
  static async getFailedPaymentsStats(userId: string) {
    await connectToDatabase();
    
    const user = await Utilisateur.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const failedPayments = user.failedPayments || [];
    const totalAmount = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      userId: user._id,
      userEmail: user.email,
      userName: user.firstName,
      totalFailedPayments: failedPayments.length,
      totalAmount,
      failedPayments: failedPayments.map(fp => ({
        ...fp,
        failedAt: fp.failedAt instanceof Date ? fp.failedAt.toISOString() : fp.failedAt
      }))
    };
  }

  /**
   * Récupérer les statistiques des paiements échoués pour un site
   */
  static async getSiteFailedPaymentsStats(siteId: string) {
    await connectToDatabase();
    
    // Récupérer tous les utilisateurs du site avec des paiements échoués
    const users = await Utilisateur.find({
      siteId,
      failedPayments: { $exists: true, $ne: [] }
    });

    const totalUsers = await Utilisateur.countDocuments({ siteId });
    const usersWithFailedPayments = users.length;
    
    let totalFailedPayments = 0;
    let totalAmount = 0;
    const allFailedPayments: any[] = [];

    users.forEach(user => {
      const failedPayments = user.failedPayments || [];
      totalFailedPayments += failedPayments.length;
      totalAmount += failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      failedPayments.forEach(fp => {
        allFailedPayments.push({
          ...fp,
          userId: user._id,
          userEmail: user.email,
          userName: user.firstName,
          failedAt: fp.failedAt instanceof Date ? fp.failedAt.toISOString() : fp.failedAt
        });
      });
    });

    return {
      totalUsers,
      usersWithFailedPayments,
      totalFailedPayments,
      totalAmount,
      failedPayments: allFailedPayments.sort((a, b) => 
        new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime()
      )
    };
  }
}

export default StripeEventHandler;