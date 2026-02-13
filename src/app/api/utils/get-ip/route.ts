import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les headers pour déterminer l'IP
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = headersList.get('x-client-ip');

    // Essayer différentes sources d'IP
    let ip = forwardedFor?.split(',')[0]?.trim() ||
             realIp ||
             clientIp ||
             request.ip ||
             '127.0.0.1'; // fallback pour développement

    // Nettoyer l'IP (enlever le port si présent)
    ip = ip.split(':')[0];

    // Pour le développement local, utiliser une IP de test
    if (ip === '127.0.0.1' || ip === '::1') {
      ip = '127.0.0.1'; // IP de développement
    }

    return NextResponse.json({ ip });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'IP:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}