import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { hash } from 'bcryptjs';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';

// POST - Créer un nouvel utilisateur
export async function POST(request: Request) {
    try {
        console.log("🔄 Début création utilisateur");
        await connectToDatabase();
        console.log("✅ Connexion DB établie");
        
        const userData = await request.json();
        console.log("📥 Données reçues:", { ...userData, password: userData.password ? '[MASQUÉ]' : undefined });
        
        // Vérification des champs requis
        if (!userData.siteId) {
            console.log("❌ siteId manquant");
            return NextResponse.json({ error: "siteId requis" }, { status: 400 });
        }
        
        if (!userData.email) {
            console.log("❌ Email manquant");
            return NextResponse.json({ error: "Email requis" }, { status: 400 });
        }
        
        if (!userData.firstName) {
            console.log("❌ Prénom manquant");
            return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
        }
        
        if (!userData.lastName) {
            console.log("❌ Nom manquant");
            return NextResponse.json({ error: "Nom requis" }, { status: 400 });
        }
        
        if (!userData.password) {
            console.log("❌ Mot de passe manquant");
            return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
        }

        // Validation du numéro de téléphone si fourni
        if (userData.phone) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(userData.phone)) {
                console.log("❌ Format de téléphone invalide:", userData.phone);
                return NextResponse.json({ error: "Format de numéro de téléphone invalide" }, { status: 400 });
            }
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await Utilisateur.findOne({ 
            email: userData.email, 
            siteId: userData.siteId 
        });
        
        if (existingUser) {
            console.log("❌ Utilisateur existe déjà:", userData.email);
            return NextResponse.json({ 
                error: "Un utilisateur avec cet email existe déjà pour ce site" 
            }, { status: 409 });
        }

        // Hasher le mot de passe
        console.log("🔐 Hachage du mot de passe...");
        const hashedPassword = await hash(userData.password, 12);
        console.log("✅ Mot de passe haché");

        // Préparer les données utilisateur avec valeurs par défaut
        const userDataToSave = {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            password: hashedPassword,
            role: userData.role || 'user',
            status: 'active', // Forcer le statut à 'active'
            siteId: userData.siteId,
            phone: userData.phone || undefined,
            avatar: userData.avatar || undefined,
            permissions: userData.permissions || (userData.role === 'admin' ? ['read', 'write', 'delete', 'manage_users', 'manage_site'] : ['read'])
        };
        
        console.log("💾 Sauvegarde en cours...", { ...userDataToSave, password: '[MASQUÉ]' });
        
        // Créer l'utilisateur
        const newUser = await Utilisateur.create(userDataToSave);
        console.log("✅ Utilisateur créé avec succès:", newUser._id);
        
        // Créer automatiquement un client Stripe pour cet utilisateur
        try {
          console.log("🔗 Création du client Stripe...");
          const stripeKeys = await getStripeKeysFromDatabase(userData.siteId);
          
          if (stripeKeys.stripeSecretKey) {
            const stripe = new Stripe(stripeKeys.stripeSecretKey, {
              apiVersion: '2025-07-30.basil',
            });
            
            const customer = await stripe.customers.create({
              email: userData.email,
              name: `${userData.firstName} ${userData.lastName}`,
              metadata: {
                userId: newUser._id.toString(),
                siteId: userData.siteId
              }
            });
            
            // Mettre à jour l'utilisateur avec l'ID client Stripe
            await Utilisateur.findByIdAndUpdate(newUser._id, {
              stripeCustomerId: customer.id
            });
            
            console.log("✅ Client Stripe créé avec succès:", customer.id);
          } else {
            console.log("⚠️ Pas de clés Stripe configurées pour ce site");
          }
        } catch (stripeError) {
          console.error("❌ Erreur lors de la création du client Stripe:", stripeError);
          // Ne pas faire échouer la création de l'utilisateur si Stripe échoue
        }
        
        // Retirer le mot de passe des données retournées
        const { password, ...safeUser } = newUser.toObject();
        
        // Convertir l'_id en string pour le frontend
        const responseUser = {
            ...safeUser,
            id: newUser._id.toString()
        };
        
        console.log("📤 Retour utilisateur:", { ...responseUser, password: undefined });
        return NextResponse.json(responseUser, { status: 201 });
        
    } catch (err: any) {
        console.error("❌ Erreur détaillée dans createUser:", {
            message: err.message,
            code: err.code,
            keyPattern: err.keyPattern,
            keyValue: err.keyValue,
            errors: err.errors,
            stack: err.stack
        });
        
        // Gestion spécifique des erreurs de validation Mongoose
        if (err.name === 'ValidationError') {
            const validationErrors = Object.values(err.errors).map((e: any) => e.message);
            return NextResponse.json({ 
                error: "Erreur de validation",
                details: validationErrors 
            }, { status: 400 });
        }
        
        // Gestion des erreurs de doublon (index unique)
        if (err.code === 11000) {
            const keyPattern = err.keyPattern || {};
            const keyValue = err.keyValue || {};
            
            // Si c'est l'index composé email+siteId
            if (keyPattern.email && keyPattern.siteId) {
                return NextResponse.json({ 
                    error: `Un utilisateur avec l'email '${keyValue.email}' existe déjà pour ce site` 
                }, { status: 409 });
            }
            
            // Pour les autres cas de doublon
            const field = Object.keys(keyPattern)[0];
            const value = keyValue[field] || 'inconnu';
            return NextResponse.json({ 
                error: `Un utilisateur avec ${field} '${value}' existe déjà` 
            }, { status: 409 });
        }
        
        // Erreur générique avec plus de contexte
        return NextResponse.json({ 
            error: "Erreur lors de la création de l'utilisateur",
            details: err.message || "Erreur inconnue",
            code: err.code || 'UNKNOWN'
        }, { status: 500 });
    }
}

// GET - Récupérer tous les utilisateurs d'un site
export async function GET(request: Request) {
    try {
        console.log("🔄 Début récupération utilisateurs");
        await connectToDatabase();
        console.log("✅ Connexion DB établie");
        
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        console.log("🔍 Recherche pour siteId:", siteId);

        if (!siteId) {
            console.log("❌ siteId manquant");
            return NextResponse.json({ error: "siteId requis" }, { status: 400 });
        }

        const users = await Utilisateur.find({ siteId }).sort({ createdAt: -1 });
        console.log("✅ Utilisateurs trouvés:", users.length);
        
        // Retirer les mots de passe des données retournées
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user.toObject();
            return {
                ...safeUser,
                id: safeUser._id.toString()
            };
        });

        // Calculer les statistiques
        const stats = {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            inactive: users.filter(u => u.status === 'inactive').length,
            byRole: {} as Record<string, number>,
            recentLogins: users.filter(u => {
                if (!u.lastLogin) return false;
                const lastLogin = new Date(u.lastLogin);
                const now = new Date();
                const diffDays = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
                return diffDays <= 7;
            }).length
        };

        // Calculer les statistiques par rôle
        users.forEach(user => {
            stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
        });

        console.log("📤 Retour stats:", stats);
        return NextResponse.json({ users: safeUsers, stats }, { status: 200 });
        
    } catch (err: any) {
        console.error("❌ Erreur détaillée dans getUsers:", {
            message: err.message,
            stack: err.stack
        });
        return NextResponse.json({ 
            error: "Erreur lors de la récupération des utilisateurs",
            details: err.message || "Erreur inconnue"
        }, { status: 500 });
    }
} 