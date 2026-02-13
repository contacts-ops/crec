import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

// GET - Récupérer la configuration des horaires
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 });
    }

    await connectToDatabase();
    const site = await Site.findOne({ siteId });



    if (!site) {
      return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 });
    }

    // Configuration par défaut si aucune n'existe
    const defaultAvailability = {
      monday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      friday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' }
    };

    const availability = site.availabilityConfig || defaultAvailability;

    return NextResponse.json({
      success: true,
      availability
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la configuration des horaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

// POST - Sauvegarder la configuration des horaires
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, availability } = body;

    if (!siteId || !availability) {
      return NextResponse.json({ error: 'siteId et availability requis' }, { status: 400 });
    }

    // Validation de la structure des données
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const requiredFields = ['enabled', 'start', 'end', 'pauseStart', 'pauseEnd'];

    for (const day of requiredDays) {
      if (!availability[day]) {
        return NextResponse.json({ error: `Configuration manquante pour ${day}` }, { status: 400 });
      }

      for (const field of requiredFields) {
        if (!(field in availability[day])) {
          return NextResponse.json({ error: `Champ ${field} manquant pour ${day}` }, { status: 400 });
        }
      }

      // Validation des heures
      if (availability[day].enabled) {
        const startTime = availability[day].start;
        const endTime = availability[day].end;
        const pauseStart = availability[day].pauseStart;
        const pauseEnd = availability[day].pauseEnd;
        
        // Validation des heures principales
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime) || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
          return NextResponse.json({ error: `Format d'heure invalide pour ${day}` }, { status: 400 });
        }

        // Vérifier que l'heure de fin est après l'heure de début
        if (startTime >= endTime) {
          return NextResponse.json({ error: `L'heure de fin doit être après l'heure de début pour ${day}` }, { status: 400 });
        }

        // Validation des heures de pause
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(pauseStart) || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(pauseEnd)) {
          return NextResponse.json({ error: `Format d'heure de pause invalide pour ${day}` }, { status: 400 });
        }

        // Vérifier que la pause est dans les horaires de travail
        if (pauseStart < startTime || pauseEnd > endTime) {
          return NextResponse.json({ error: `La pause doit être dans les horaires de travail pour ${day}` }, { status: 400 });
        }

        // Vérifier que l'heure de fin de pause est après l'heure de début de pause
        if (pauseStart >= pauseEnd) {
          return NextResponse.json({ error: `L'heure de fin de pause doit être après l'heure de début de pause pour ${day}` }, { status: 400 });
        }
      }
    }

    await connectToDatabase();
    

    
    // Vérifier si le site existe
    const existingSite = await Site.findOne({ siteId });

    // Mettre à jour ou créer la configuration
    const updateResult = await Site.updateOne(
      { siteId },
      { 
        $set: { 
          availabilityConfig: availability,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );


    if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }

    // Vérifier que la mise à jour a bien été effectuée
    const updatedSite = await Site.findOne({ siteId });

    

    console.log('✅ Configuration des horaires sauvegardée pour le site:', siteId);

    return NextResponse.json({
      success: true,
      message: 'Configuration des horaires sauvegardée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration des horaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la configuration' },
      { status: 500 }
    );
  }
}
