import { NextResponse } from 'next/server';

export async function POST() {
    try {
        // Créer la réponse
        const response = NextResponse.json({
            message: "Déconnexion réussie"
        });

        // Supprimer le cookie utilisateur
        response.cookies.set("utilisateur_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0, // Expire immédiatement
        });

        return response;
    } catch (err) {
        console.error("Erreur dans logout:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors de la déconnexion" }, { status: 500 });
    }
} 