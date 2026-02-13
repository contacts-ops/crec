import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import { Form } from '../../../../../lib/models/Form';

const buildDomiciliationFilename = (
  form: any,
  date: Date = new Date()
) => {
  const rawName =
    form?.companyName ||
    `${form?.ceoFirstName || form?.firstName || ""} ${form?.ceoLastName || form?.lastName || ""}`.trim() ||
    "client";
  const safeName = rawName.replace(/[^a-zA-Z0-9-_]+/g, "_") || "client";
  const dateSource = form?.createdAt ? new Date(form.createdAt) : date;
  const dateStr = dateSource.toISOString().split('T')[0];
  return `contrat_domiciliation_Arche_${safeName}_${dateStr}.pdf`;
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 Début téléchargement contrat pour ID:', params.id);
    
    // Connexion à la base de données
    await connectToDatabase();
    
    // Récupérer le formulaire avec le contrat PDF
    const form = await Form.findById(params.id);
    
    if (!form) {
      console.log('❌ Formulaire non trouvé:', params.id);
      return NextResponse.json({ error: 'Formulaire non trouvé' }, { status: 404 });
    }
    
    if (!form.contratPdf) {
      console.log('❌ Contrat PDF non trouvé pour le formulaire:', params.id);
      return NextResponse.json({ error: 'Contrat PDF non trouvé' }, { status: 404 });
    }
    
    console.log('✅ Contrat PDF trouvé, préparation du téléchargement');
    
    // Convertir le base64 en buffer
    const base64Data = form.contratPdf.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = buildDomiciliationFilename(form);

    // Retourner le PDF avec les bons headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement du contrat:', error);
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du contrat' },
      { status: 500 }
    );
  }
}
