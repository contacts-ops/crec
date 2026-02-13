import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { Form } from '../../../../lib/models/Form';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log("Début de la requête GET /api/formulaires/by-ip");

    // Récupérer l'IP du client
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = headersList.get('x-client-ip');

    // Essayer différentes sources d'IP
    let ip = forwardedFor?.split(',')[0]?.trim() ||
             realIp ||
             clientIp ||
             request.ip ||
             'unknown';

    // Nettoyer l'IP (enlever le port si présent)
    ip = ip.split(':')[0];

    console.log("IP détectée:", ip);

    if (!ip || ip === 'unknown') {
      return NextResponse.json({
        error: 'Impossible de déterminer l\'adresse IP'
      }, { status: 400 });
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Rechercher les formulaires récents (derniers 30 jours) avec cette IP
    // qui ne sont pas terminés (draft ou paid)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const forms = await Form.find({
      ipAddress: ip,
      status: { $in: ['draft', 'paid'] },
      createdAt: { $gte: thirtyDaysAgo }
    })
    .sort({ updatedAt: -1 }) // Plus récent en premier
    .limit(5); // Maximum 5 formulaires

    console.log(`Trouvé ${forms.length} formulaire(s) pour l'IP ${ip}`);

    return NextResponse.json({
      success: true,
      forms: forms.map(form => ({
        _id: form._id,
        currentStep: form.currentStep,
        status: form.status,
        legalForm: form.legalForm,
        firstName: form.firstName,
        lastName: form.lastName,
        companyName: form.companyName,
        updatedAt: form.updatedAt,
        createdAt: form.createdAt
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des formulaires par IP:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
