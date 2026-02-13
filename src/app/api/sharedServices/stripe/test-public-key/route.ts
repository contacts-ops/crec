import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    console.log("🔍 DEBUG - test-public-key appelé avec siteId:", siteId);

    return NextResponse.json({
      message: 'Endpoint de test fonctionnel',
      siteId: siteId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur dans l\'endpoint de test:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
