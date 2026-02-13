import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { StripeService } from '@/lib/services/stripeService';

// GET - Récupérer un utilisateur par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔄 Début récupération utilisateur par ID");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");
    
    const userId = params.id;
    console.log("🔍 Recherche utilisateur ID:", userId);

    const user = await Utilisateur.findById(userId);
    
    if (!user) {
      console.log("❌ Utilisateur non trouvé");
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Retirer le mot de passe des données retournées
    const { password, ...safeUser } = user.toObject();
    
    // Convertir l'_id en string pour le frontend
    const responseUser = {
      ...safeUser,
      id: user._id.toString()
    };

    console.log("✅ Utilisateur trouvé:", responseUser.email);
    return NextResponse.json(responseUser);
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

// PUT - Mettre à jour un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔄 Début mise à jour utilisateur");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");
    
    const userId = params.id;
    const updateData = await request.json();
    console.log("📥 Données de mise à jour reçues:", { ...updateData, password: updateData.password ? '[MASQUÉ]' : undefined });

    // Vérifier si l'utilisateur existe
    const existingUser = await Utilisateur.findById(userId);
    if (!existingUser) {
      console.log("❌ Utilisateur non trouvé");
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Si un mot de passe est fourni, le hasher
    if (updateData.password) {
      const { hash } = await import('bcryptjs');
      updateData.password = await hash(updateData.password, 12);
      console.log("🔐 Mot de passe haché");
    }

    // Gérer la création du client Stripe si nécessaire
    if (updateData.createStripeCustomer && !existingUser.stripeCustomerId) {
      try {
        console.log("💳 Création du client Stripe...");
        const stripeCustomerId = await StripeService.createCustomerForUser(userId, existingUser.siteId);
        updateData.stripeCustomerId = stripeCustomerId;
        console.log("✅ Client Stripe créé:", stripeCustomerId);
      } catch (stripeError) {
        console.error("❌ Erreur lors de la création du client Stripe:", stripeError);
        return NextResponse.json({ 
          error: "Erreur lors de la création du client Stripe",
          details: stripeError instanceof Error ? stripeError.message : "Erreur inconnue"
        }, { status: 500 });
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await Utilisateur.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log("❌ Erreur lors de la mise à jour");
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    // Retirer le mot de passe des données retournées
    const { password, ...safeUser } = updatedUser.toObject();
    
    // Convertir l'_id en string pour le frontend
    const responseUser = {
      ...safeUser,
      id: updatedUser._id.toString()
    };

    console.log("✅ Utilisateur mis à jour avec succès:", responseUser.email);
    return NextResponse.json(responseUser);
    
  } catch (error: any) {
    console.error("❌ Erreur détaillée dans updateUser:", {
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      errors: error.errors,
      stack: error.stack
    });
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: "Un utilisateur avec cet email existe déjà pour ce site" 
      }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

// DELETE - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔄 Début suppression utilisateur");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");
    
    const userId = params.id;
    console.log("🗑️ Suppression utilisateur ID:", userId);

    // Vérifier si l'utilisateur existe
    const existingUser = await Utilisateur.findById(userId);
    if (!existingUser) {
      console.log("❌ Utilisateur non trouvé");
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Supprimer le client Stripe si il existe
    if (existingUser.stripeCustomerId) {
      try {
        console.log("💳 Suppression du client Stripe...");
        await StripeService.deleteCustomer(existingUser.stripeCustomerId, existingUser.siteId);
        console.log("✅ Client Stripe supprimé");
      } catch (stripeError) {
        console.error("⚠️ Erreur lors de la suppression du client Stripe:", stripeError);
        // Continuer la suppression de l'utilisateur même si Stripe échoue
      }
    }

    // Supprimer l'utilisateur
    await Utilisateur.findByIdAndDelete(userId);
    console.log("✅ Utilisateur supprimé avec succès");

    return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
    
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de l'utilisateur:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
} 