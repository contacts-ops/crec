import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Entreprise } from '@/lib/models/Entreprise';

export async function POST(request: Request) {
    try {
        console.log("🔄 Début POST /api/sharedServices/entreprise");
        await connectToDatabase();
        const entrepriseData = await request.json();
        console.log("📝 Données reçues pour la création de l'entreprise:", entrepriseData);
        console.log("🔍 Champ nomRepresentant présent:", entrepriseData.nomRepresentant);
        
        console.log("✅ Création de l'entreprise...");
        console.log("📤 Données à sauvegarder:", JSON.stringify(entrepriseData, null, 2));
        
        const newEntreprise = await Entreprise.create(entrepriseData);
        console.log("✅ Entreprise créée avec succès:", newEntreprise._id);

        return NextResponse.json(newEntreprise, { status: 201 });
    } catch (err) {
        console.error("❌ Erreur dans createEntreprise:", err);
        
        // Gestion spécifique des erreurs de validation Mongoose
        if (err instanceof Error && err.name === 'ValidationError') {
            console.error("❌ Erreur de validation Mongoose:", err.message);
            return NextResponse.json({ 
                error: "Données invalides",
                details: err.message
            }, { status: 400 });
        }
        
        // Gestion des erreurs de duplication
        if (err instanceof Error && err.message.includes('duplicate key')) {
            console.error("❌ Erreur de duplication:", err.message);
            return NextResponse.json({ 
                error: "Une entreprise existe déjà pour ce site",
                details: err.message
            }, { status: 409 });
        }
        
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        console.log("🔄 Début GET /api/sharedServices/entreprise");
        await connectToDatabase();
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        console.log("🔍 Recherche pour siteId:", siteId);
        
        let query = {};
        if (siteId) {
            query = { siteId: siteId };
        }
        
        console.log("🔍 Query:", query);
        const entreprises = await Entreprise.find(query).sort({ createdAt: -1 });
        console.log("✅ Entreprises trouvées:", entreprises.length);
        
        return NextResponse.json(entreprises, { status: 200 });
    } catch (err) {
        console.error("❌ Erreur dans getEntreprises:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
} 