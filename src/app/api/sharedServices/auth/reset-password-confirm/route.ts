import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { Utilisateur } from "@/lib/models/Utilisateur";

export async function POST(req: Request) {
  try {
    const { token, password, siteId } = await req.json();
    if (!token || !password || !siteId) {
      return NextResponse.json(
        { error: "Token, mot de passe et siteId requis." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await Utilisateur.findOne({ resetToken: token, siteId });
    console.log("[reset-password-confirm] Lookup:", { tokenPresent: !!token, siteId, userFound: !!user });
    console.log("[reset-password-confirm] resetExpires:", user?.resetExpires);
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return NextResponse.json(
        { error: "Token invalide ou expiré." },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    console.log("[reset-password-confirm] Password updated and token invalidated for:", user._id.toString());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("sharedServices reset-password-confirm:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}


