import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Proxy simple pour servir un PDF en inline dans le navigateur
// Usage: /api/sharedServices/invoices/pdf?url=<encoded_pdf_url>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Paramètre url manquant' }, { status: 400 });
    }

    // Sécurité minimale: autoriser seulement les URLs Stripe
    const allowedHosts = ['files.stripe.com', 'pay.stripe.com', 'invoicedocs.stripe.com'];
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    if (!allowedHosts.includes(url.hostname)) {
      return NextResponse.json({ error: 'Hôte non autorisé' }, { status: 400 });
    }

    // Récupérer le PDF depuis Stripe
    const upstream = await fetch(targetUrl, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Impossible de récupérer le PDF' }, { status: 502 });
    }

    // Transmettre le flux en forçant l'affichage inline
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'inline; filename="invoice.pdf"');
    // Préserver quelques entêtes utiles si disponibles
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) headers.set('Cache-Control', cacheControl);

    return new Response(upstream.body, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Erreur proxy PDF:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}


