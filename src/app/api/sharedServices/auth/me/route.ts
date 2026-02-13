import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import { Utilisateur } from "@/lib/models/Utilisateur";

export async function GET(req: NextRequest) {
  try {
    // Récupérer le token depuis le cookie HTTP-only pour les Utilisateurs
    const token = req.cookies.get("utilisateur_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Non autorisé - Token utilisateur manquant" },
        { status: 401 }
      );
    }

    // Vérifier et décoder le JWT
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { error: "Token utilisateur invalide ou expiré" },
        { status: 401 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer l'utilisateur depuis la base de données (sans le mot de passe)
    const user = await Utilisateur
      .findById(payload.userId)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Retourner les données de profil
    return NextResponse.json({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      siteId: user.siteId,
      phone: user.phone,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 