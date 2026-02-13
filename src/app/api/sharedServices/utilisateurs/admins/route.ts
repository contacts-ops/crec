import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';

// GET - Récupérer tous les administrateurs d'un site
export async function GET(request: Request) {
    try {
        console.log("🔄 Début récupération administrateurs");
        await connectToDatabase();
        console.log("✅ Connexion DB établie");
        
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        console.log("🔍 Recherche administrateurs pour siteId:", siteId);

        if (!siteId) {
            console.log("❌ siteId manquant");
            return NextResponse.json({ error: "siteId requis" }, { status: 400 });
        }

        // Récupérer tous les utilisateurs avec le rôle 'admin' pour ce site
        const admins = await Utilisateur.find({ 
            siteId, 
            role: 'admin',
            status: 'active' // Seulement les administrateurs actifs
        }).sort({ createdAt: -1 });
        
        console.log("✅ Administrateurs trouvés:", admins.length);
        
        // Retirer les mots de passe des données retournées
        const safeAdmins = admins.map(admin => {
            const { password, ...safeAdmin } = admin.toObject();
            return {
                ...safeAdmin,
                id: safeAdmin._id.toString()
            };
        });

        console.log("📤 Retour administrateurs:", safeAdmins.length);
        return NextResponse.json({ 
            admins: safeAdmins, 
            count: safeAdmins.length 
        }, { status: 200 });
        
    } catch (err: any) {
        console.error("❌ Erreur détaillée dans getAdmins:", {
            message: err.message,
            stack: err.stack
        });
        return NextResponse.json({ 
            error: "Erreur lors de la récupération des administrateurs",
            details: err.message || "Erreur inconnue"
        }, { status: 500 });
    }
}
