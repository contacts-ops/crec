import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';

/**
 * Service pour gérer les opérations Stripe liées aux utilisateurs et sites
 */
export class StripeService {
  
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
   * Créer un client Stripe pour un utilisateur
   */
  static async createCustomerForUser(userId: string, siteId: string): Promise<string> {
    try {
      await connectToDatabase();
      
      // Récupérer les informations de l'utilisateur
      const user = await Utilisateur.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Obtenir l'instance Stripe pour ce site
      const stripe = await this.getStripeInstance(siteId);

      // Créer le client Stripe avec les métadonnées du site
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        metadata: {
          userId: userId,
          siteId: siteId,
          userEmail: user.email
        }
      });

      // Mettre à jour l'utilisateur avec l'ID client Stripe
      await Utilisateur.findByIdAndUpdate(userId, {
        stripeCustomerId: customer.id
      });

      console.log(`✅ Client Stripe créé pour l'utilisateur ${userId}: ${customer.id}`);
      return customer.id;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du client Stripe:', error);
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par son ID client Stripe
   */
  static async getUserByStripeCustomerId(customerId: string) {
    try {
      await connectToDatabase();
      
      const user = await Utilisateur.findOne({ stripeCustomerId: customerId });
      if (!user) {
        console.log(`⚠️ Aucun utilisateur trouvé pour le client Stripe: ${customerId}`);
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Récupérer les administrateurs d'un site pour les notifications
   */
  static async getSiteAdmins(siteId: string) {
    try {
      await connectToDatabase();
      
      const admins = await Utilisateur.find({
        siteId: siteId,
        role: 'admin',
        status: 'active'
      });
      
      return admins;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des administrateurs:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les informations du client Stripe
   */
  static async updateCustomerInfo(customerId: string, siteId: string, userData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    try {
      // Obtenir l'instance Stripe pour ce site
      const stripe = await this.getStripeInstance(siteId);
      
      const updateData: any = {};
      
      if (userData.email) updateData.email = userData.email;
      if (userData.firstName || userData.lastName) {
        updateData.name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      }
      if (userData.phone) updateData.phone = userData.phone;

      await stripe.customers.update(customerId, updateData);
      console.log(`✅ Informations client Stripe mises à jour: ${customerId}`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du client Stripe:', error);
      throw error;
    }
  }

  /**
   * Supprimer un client Stripe (lors de la suppression d'un utilisateur)
   */
  static async deleteCustomer(customerId: string, siteId: string) {
    try {
      // Obtenir l'instance Stripe pour ce site
      const stripe = await this.getStripeInstance(siteId);
      
      await stripe.customers.del(customerId);
      console.log(`✅ Client Stripe supprimé: ${customerId}`);
      
      // Supprimer la référence dans la base de données
      await connectToDatabase();
      await Utilisateur.updateMany(
        { stripeCustomerId: customerId },
        { $unset: { stripeCustomerId: 1 } }
      );
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du client Stripe:', error);
      throw error;
    }
  }

  /**
   * Récupérer les informations d'un client Stripe
   */
  static async getCustomerInfo(customerId: string, siteId: string) {
    try {
      // Obtenir l'instance Stripe pour ce site
      const stripe = await this.getStripeInstance(siteId);
      
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      return customer;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du client Stripe:', error);
      throw error;
    }
  }
}

export default StripeService;
