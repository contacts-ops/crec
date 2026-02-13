import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

export async function POST(request: Request) {
    try {
        await connectToDatabase();
        const { email, password, siteId } = await request.json();

        // Validation des données
        if (!email || !password || !siteId) {
            return NextResponse.json({ error: "Email, mot de passe et siteId requis" }, { status: 400 });
        }

        // Rechercher l'utilisateur
        const user = await Utilisateur.findOne({ email, siteId });

        if (!user) {
            return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
        }

        // Vérifier le statut de l'utilisateur
        if (user.status !== 'active') {
            return NextResponse.json({ 
                error: "Compte non activé. Veuillez contacter l'administrateur." 
            }, { status: 403 });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
        }

        // Mettre à jour la dernière connexion
        await Utilisateur.findByIdAndUpdate(
            user._id,
            { lastLogin: new Date() }
        );

        // Créer le token JWT
        const token = sign(
            { 
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
                siteId: user.siteId,
                permissions: user.permissions
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Retirer le mot de passe des données retournées
        const { password: _, ...safeUser } = user.toObject();

        // Créer la réponse avec le cookie utilisateur
        const response = NextResponse.json({
            user: safeUser,
            message: "Connexion réussie"
        });

        // Définir le cookie pour les Utilisateurs (différent du cookie User)
        response.cookies.set("utilisateur_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 24 * 60 * 60, // 24 heures
        });

        return response;
    } catch (err) {
        console.error("Erreur dans login:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
} 