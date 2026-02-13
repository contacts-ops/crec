import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Utilisateur } from "@/lib/models/Utilisateur";
import { emailService } from "@/_sharedServices/emailService";

export async function POST(req: Request) {
  try {
    const { email, siteId } = await req.json();
    if (!email || !siteId) {
      return NextResponse.json(
        { error: "Email et siteId requis." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await Utilisateur.findOne({ email, siteId });
    if (user) {
      console.log("[forgot-password] Utilisateur trouvé:", { id: user._id.toString(), email: user.email, siteId });
      const token = crypto.randomBytes(32).toString("hex");
      user.resetToken = token;
      user.resetExpires = new Date(Date.now() + 3600_000); // 1h
      await user.save();

      const base = process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.FRONTEND_URL;

      const isLive = base && !base.includes('localhost') && !base.includes('hub.majoli.io');
      const link = isLive ? `${base}/reset-password?token=${token}` : `${base}/sites/${siteId}/reset-password?token=${token}`;

      await emailService.sendPasswordResetEmail(
        user.email,
        link,
        user.firstName,
        siteId
      );
    } 

    return NextResponse.json({
      message:
        "Si un compte correspondant à cette adresse existe, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("sharedServices forgot-password:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}