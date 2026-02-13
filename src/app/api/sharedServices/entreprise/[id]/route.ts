import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Entreprise } from '@/lib/models/Entreprise';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    console.log("🔄 GET /api/sharedServices/entreprise/[id]", id);
    
    try {
        await connectToDatabase();
        const entreprise = await Entreprise.findById(id);
        
        if (!entreprise) {
            console.log("❌ Entreprise non trouvée pour l'ID:", id);
            return NextResponse.json({ error: "Aucune entreprise trouvée" }, { status: 404 });
        }
        
        console.log("✅ Entreprise trouvée:", entreprise._id);
        return NextResponse.json(entreprise, { status: 200 });
    } catch (err) {
        console.error("❌ Erreur dans getEntreprise:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    console.log("🔄 PUT /api/sharedServices/entreprise/[id]", id);
    
    try {
        await connectToDatabase();
        const entrepriseData = await request.json();
        console.log("📝 Données reçues pour mise à jour:", entrepriseData);
        console.log("🔍 Champ nomRepresentant présent:", entrepriseData.nomRepresentant);

        const entreprise = await Entreprise.findByIdAndUpdate(id, entrepriseData, { new: true, runValidators: true });

        if (!entreprise) {
            console.log("❌ Entreprise non trouvée pour l'ID:", id);
            return NextResponse.json({ error: "Aucune entreprise trouvée" }, { status: 404 });
        }

        console.log("✅ Entreprise mise à jour:", entreprise._id);
        return NextResponse.json(entreprise, { status: 200 });
    } catch (err) {
        console.error("❌ Erreur dans updateEntreprise:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    console.log("🔄 DELETE /api/sharedServices/entreprise/[id]", id);
    
    try {
        await connectToDatabase();
        const entreprise = await Entreprise.findByIdAndDelete(id);
        console.log("✅ Entreprise supprimée:", id);
        return NextResponse.json(entreprise, { status: 200 });
    } catch (err) {
        console.error("❌ Erreur dans deleteEntreprise:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    console.log("🔄 PATCH /api/sharedServices/entreprise/[id]", id);
    
    try {
        await connectToDatabase();
        const entrepriseData = await request.json();
        console.log("📝 Données reçues pour patch:", entrepriseData);
        
        const entreprise = await Entreprise.findByIdAndUpdate(id, entrepriseData, { new: true });
        console.log("✅ Entreprise patchée:", entreprise?._id);
        
        return NextResponse.json(entreprise, { status: 200 });
    } catch (err) {
        console.error("❌ Erreur dans patchEntreprise:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
} 