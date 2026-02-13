import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';

// GET - Récupérer un abonnement spécifique par ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        console.log("🔄 Début GET /api/sharedServices/abonnements/[id]");
        await connectToDatabase();
        
        const { id } = params;
        console.log("🔍 Recherche abonnement ID:", id);
        
        const abonnement = await Abonnement.findById(id);
        
        if (!abonnement) {
            console.log("❌ Abonnement non trouvé");
            return NextResponse.json({ 
                error: "Abonnement non trouvé" 
            }, { status: 404 });
        }
        
        console.log("✅ Abonnement trouvé:", abonnement._id);
        return NextResponse.json(abonnement, { status: 200 });
        
    } catch (err) {
        console.error("❌ Erreur dans getAbonnementById:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}

// PUT - Mettre à jour un abonnement spécifique par ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        console.log("🔄 Début PUT /api/sharedServices/abonnements/[id]");
        await connectToDatabase();
        
        const { id } = params;
        const updateData = await request.json();
        console.log("📝 Mise à jour abonnement ID:", id, "avec:", updateData);
        
        const updatedAbonnement = await Abonnement.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        
        if (!updatedAbonnement) {
            console.log("❌ Abonnement non trouvé pour mise à jour");
            return NextResponse.json({ 
                error: "Abonnement non trouvé" 
            }, { status: 404 });
        }
        
        console.log("✅ Abonnement mis à jour:", updatedAbonnement._id);
        return NextResponse.json(updatedAbonnement, { status: 200 });
        
    } catch (err) {
        console.error("❌ Erreur dans updateAbonnement:", err);
        
        if (err instanceof Error && err.name === 'ValidationError') {
            console.error("❌ Erreur de validation Mongoose:", err.message);
            return NextResponse.json({ 
                error: "Données invalides",
                details: err.message
            }, { status: 400 });
        }
        
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}

// DELETE - Supprimer un abonnement spécifique par ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        console.log("🔄 Début DELETE /api/sharedServices/abonnements/[id]");
        await connectToDatabase();
        
        const { id } = params;
        console.log("🗑️ Suppression abonnement ID:", id);
        
        const deletedAbonnement = await Abonnement.findByIdAndDelete(id);
        
        if (!deletedAbonnement) {
            console.log("❌ Abonnement non trouvé pour suppression");
            return NextResponse.json({ 
                error: "Abonnement non trouvé" 
            }, { status: 404 });
        }
        
        console.log("✅ Abonnement supprimé:", deletedAbonnement._id);
        return NextResponse.json({ 
            success: true,
            message: "Abonnement supprimé avec succès" 
        }, { status: 200 });
        
    } catch (err) {
        console.error("❌ Erreur dans deleteAbonnement:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
} 