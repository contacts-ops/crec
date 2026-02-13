import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';
import { Site, type ISite } from '@/lib/models/Site';

export async function POST(request: Request) {
    try {
        await connectToDatabase();
        const abonnementData = await request.json();
        const siteIdFromPayload = typeof abonnementData?.siteId === 'string' ? abonnementData.siteId : undefined;
        
        // Déterminer le mode Stripe courant depuis le site pour marquer l'abonnement
        let stripeMode: 'test' | 'live' | undefined = undefined;
        try {
          if (siteIdFromPayload) {
            const site = await (Site as any).findOne({ siteId: siteIdFromPayload }).lean();
            if (site?.stripe?.isTestMode === true) stripeMode = 'test';
            if (site?.stripe?.isTestMode === false) stripeMode = 'live';
          }
        } catch {}

        const newAbonnement = await Abonnement.create({
          ...abonnementData,
          stripeMode,
        });
        
        // Convertir explicitement en objet JSON pour s'assurer que _id est une string
        const abonnementObject = newAbonnement.toObject();
        const abonnementJSON = {
          ...abonnementObject,
          _id: newAbonnement._id.toString()
        };

        return NextResponse.json(abonnementJSON, { status: 201 });
    } catch (err) {
        console.error("❌ Erreur dans createAbonnement:", err);
        
        // Gestion spécifique des erreurs de validation Mongoose
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

export async function GET(request: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const type = searchParams.get('type');
        const duree = searchParams.get('duree');
        const stripeMode = searchParams.get('stripeMode') as 'test' | 'live' | null;
        const actifParam = searchParams.get('actif');
        
        const query: Record<string, any> = {};
        if (siteId) query.siteId = siteId;
        if (type) query.type = type;
        if (duree) query.duree = duree;
        if (stripeMode) query.stripeMode = stripeMode;
        if (actifParam !== null) query.actif = actifParam === 'true';
        
        const abonnements = await Abonnement.find(query).sort({ createdAt: -1 }).lean();
        
        return NextResponse.json(abonnements, { status: 200 });
    } catch (err) {
        console.error("❌ Erreur dans getAbonnements:", err);
        return NextResponse.json({ 
            error: "Une erreur est survenue lors du traitement de votre demande",
            details: err instanceof Error ? err.message : 'Erreur inconnue'
        }, { status: 500 });
    }
} 