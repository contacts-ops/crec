import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Chatbot } from '@/lib/models/Chatbot';

// GET - Récupérer la configuration du chatbot pour un site
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId est requis' },
        { status: 400 }
      );
    }

    // Récupérer ou créer la configuration depuis la base de données
    const chatbot = await Chatbot.findOrCreateBySiteId(siteId);

    // Transformer en format attendu par le frontend
    const config = {
      siteId: chatbot.siteId,
      welcomeTitle: chatbot.welcomeTitle,
      welcomeText: chatbot.welcomeText,
      contactPhone: chatbot.contactPhone,
      initialQuestions: chatbot.initialQuestions,
      lastUpdated: chatbot.lastUpdated.toISOString(),
    };

    console.log(`📤 Configuration récupérée pour siteId: ${siteId}`);
    console.log(`📝 Titre: ${config.welcomeTitle}`);
    console.log(`📝 Texte: ${config.welcomeText}`);
    console.log(`📞 Téléphone: ${config.contactPhone}`);
    console.log(`❓ Questions: ${config.initialQuestions.length}`);

    return NextResponse.json({
      success: true,
      config,
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la configuration du chatbot:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

// POST - Sauvegarder la configuration du chatbot
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { siteId, welcomeTitle, welcomeText, contactPhone, initialQuestions } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId est requis' },
        { status: 400 }
      );
    }

    // Récupérer ou créer la configuration
    const chatbot = await Chatbot.findOrCreateBySiteId(siteId);

    // Mettre à jour la configuration
    chatbot.welcomeTitle = welcomeTitle || chatbot.welcomeTitle;
    chatbot.welcomeText = welcomeText || chatbot.welcomeText;
    chatbot.contactPhone = contactPhone || chatbot.contactPhone;
    chatbot.initialQuestions = initialQuestions || chatbot.initialQuestions;
    chatbot.lastUpdated = new Date();

    // Sauvegarder en base de données
    await chatbot.save();

    console.log('💾 Configuration chatbot sauvegardée pour siteId:', siteId);
    console.log('📝 Titre:', chatbot.welcomeTitle);
    console.log('📝 Texte:', chatbot.welcomeText);
    console.log('📞 Téléphone:', chatbot.contactPhone);
    console.log('❓ Questions:', chatbot.initialQuestions.length);

    return NextResponse.json({
      success: true,
      message: 'Configuration sauvegardée avec succès',
      config: {
        siteId: chatbot.siteId,
        welcomeTitle: chatbot.welcomeTitle,
        welcomeText: chatbot.welcomeText,
        contactPhone: chatbot.contactPhone,
        initialQuestions: chatbot.initialQuestions,
        lastUpdated: chatbot.lastUpdated.toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration du chatbot:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la configuration' },
      { status: 500 }
    );
  }
}
