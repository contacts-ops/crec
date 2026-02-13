import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Code ou state manquant' }, { status: 400 });
  }

  // Décoder le state pour retrouver le siteId
  let siteId = '';
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    siteId = decoded.siteId;
  } catch (e) {
    return NextResponse.json({ error: 'State invalide' }, { status: 400 });
  }

  // Échanger le code contre les tokens Google
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/sharedServices/auth/google/callback`;

  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Impossible de récupérer les tokens Google', details: tokenData }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des tokens Google', details: e }, { status: 500 });
  }

  // Récupérer les infos du compte Google
  let userInfo;
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    userInfo = await userRes.json();
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des infos Google', details: e }, { status: 500 });
  }

  // Enregistrer dans la base (site_configs > google_credentials)
  try {
    await connectToDatabase();
    const site = await Site.findOne({ siteId });
    if (!site) {
      return NextResponse.json({ error: 'Site non trouvé', siteId }, { status: 404 });
    }

    // Vérifier que l'email est bien présent
    if (!userInfo.email) {
      return NextResponse.json({ 
        error: 'Email Google manquant', 
        details: 'Impossible de récupérer l\'email du compte Google' 
      }, { status: 400 });
    }

    // Créer l'objet googleCalendar avec toutes les informations
    const googleCalendarConfig = {
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: tokenData.refresh_token,
      isConfigured: true,
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
      expiryDate: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 0),
      user: userInfo,
      emailGoogle: userInfo.email,
    };

    // Mettre à jour la configuration Google Calendar
    const updateResult = await Site.updateOne(
      { siteId },
      { 
        $set: { 
          googleCalendar: googleCalendarConfig,
          lastUpdated: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

  } catch (e) {
    console.error('❌ Erreur lors de la sauvegarde en base:', e);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde en base', details: e }, { status: 500 });
  }

  // Succès
  return NextResponse.json({
    message: 'Connexion Google réussie et credentials enregistrés',
    siteId,
    googleUser: userInfo,
    tokens: {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    },
  });
} 