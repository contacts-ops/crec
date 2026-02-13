import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json({ error: 'siteId requis dans l\'URL' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Vérifier que les variables d'environnement sont configurées
  if (!clientId || !clientSecret) {
    console.error('❌ Variables d\'environnement Google OAuth manquantes:', {
      clientId: !!clientId,
      clientSecret: !!clientSecret
    });
    return NextResponse.json({ 
      error: 'Configuration Google OAuth manquante',
      details: 'Vérifiez que GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont définis dans .env.local'
    }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/sharedServices/auth/google/callback`; 

  const state = Buffer.from(JSON.stringify({ siteId })).toString('base64'); 

  const scope = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar',
  ].join(' ');

  const url = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}`; // ✅

  console.log('🔗 Redirection vers Google OAuth:', {
    clientId: clientId.substring(0, 10) + '...',
    redirectUri,
    scope
  });

  return NextResponse.redirect(url);
}
