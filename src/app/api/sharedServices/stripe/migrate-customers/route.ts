import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Récupérer tous les utilisateurs sans stripeCustomerId
    const usersWithoutStripe = await Utilisateur.find({ 
      stripeCustomerId: { $exists: false } 
    });
    
    console.log(`🔍 Trouvé ${usersWithoutStripe.length} utilisateurs sans client Stripe`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const user of usersWithoutStripe) {
      try {
        // Récupérer les clés Stripe pour le site de l'utilisateur
        const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
        
        if (!stripeKeys.stripeSecretKey) {
          results.errors.push(`Pas de clés Stripe pour le site ${user.siteId} (utilisateur ${user.email})`);
          results.failed++;
          continue;
        }
        
        const stripe = new Stripe(stripeKeys.stripeSecretKey, {
          apiVersion: '2025-07-30.basil',
        });
        
        // Créer le client Stripe
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user._id.toString(),
            siteId: user.siteId
          }
        });
        
        // Mettre à jour l'utilisateur
        await Utilisateur.findByIdAndUpdate(user._id, {
          stripeCustomerId: customer.id
        });
        
        console.log(`✅ Client Stripe créé pour ${user.email}: ${customer.id}`);
        results.success++;
        
      } catch (error) {
        console.error(`❌ Erreur pour ${user.email}:`, error);
        results.errors.push(`Erreur pour ${user.email}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        results.failed++;
      }
    }
    
    return NextResponse.json({
      message: `Migration terminée. ${results.success} succès, ${results.failed} échecs`,
      results
    });
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la migration' 
    }, { status: 500 });
  }
}
