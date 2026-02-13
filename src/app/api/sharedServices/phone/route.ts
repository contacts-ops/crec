import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { PhoneLead } from '@/lib/models/PhoneLead';

function isValidPhone(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, siteId, list } = body as {
      name?: string;
      phone?: string;
      siteId?: string;
      list?: boolean;
    };

    await connectToDatabase();

    // Liste des leads (admin)
    if (list === true || (siteId && name === undefined && phone === undefined)) {
      const query = siteId ? { siteId } : {};
      const leads = await PhoneLead.find(query).sort({ submittedAt: -1 });
      const transformed = leads.map((lead) => ({
        id: (lead as any)._id.toString(),
        name: lead.name,
        phone: lead.phone,
        date: (lead as any).submittedAt?.toISOString?.() ?? new Date().toISOString(),
        siteId: lead.siteId ?? null,
      }));
      return NextResponse.json({
        success: true,
        leads: transformed,
        total: transformed.length,
      });
    }

    // Création d'un lead (formulaire)
    if (!siteId || !name || !phone) {
      return NextResponse.json(
        { success: false, error: 'siteId, name et phone sont requis' },
        { status: 400 }
      );
    }

    const nameStr = String(name).trim();
    const phoneStr = String(phone).trim();
    if (!nameStr) {
      return NextResponse.json(
        { success: false, error: 'Le nom est requis' },
        { status: 400 }
      );
    }
    if (!isValidPhone(phoneStr)) {
      return NextResponse.json(
        { success: false, error: 'Format de numéro de téléphone invalide' },
        { status: 400 }
      );
    }

    await PhoneLead.create({
      siteId,
      name: nameStr,
      phone: phoneStr,
    });

    return NextResponse.json({
      success: true,
      message: 'Demande enregistrée. Un expert vous recontactera.',
    });
  } catch (error) {
    console.error('API Phone:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur lors du traitement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
