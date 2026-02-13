import { NextRequest, NextResponse } from 'next/server';
import { Review } from '@/lib/models/Review';
import { ReviewStats } from '@/lib/models/ReviewStats';
import { connectToDatabase } from '@/lib/db';

// Interface pour la réponse SerpAPI
interface SerpApiReview {
  snippet: string;
  author?: string;
  author_image?: string;
  rating: number;
  date: string;
  review_id?: string;
  user?: {
    name: string;
    thumbnail: string;
  };
  iso_date?: string;
}

interface SerpApiResponse {
  reviews?: SerpApiReview[];
  place_results?: {
    reviews?: SerpApiReview[];
    title?: string;
    address?: string;
    rating?: number;
    user_ratings_total?: number;
    type?: string;
  };
  serpapi_pagination?: {
    next?: string;
    next_page_token?: string;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  
  try {
    const { siteId, placeId, limit = 50 } = await request.json();

    if (!siteId) {
      return NextResponse.json(
        { error: 'SiteId est requis' },
        { status: 400 }
      );
    }

    if (!placeId) {
      return NextResponse.json(
        { error: 'PlaceId est requis pour récupérer les avis' },
        { status: 400 }
      );
    }

    // Vérifier si la clé SerpAPI est configurée
    const serpApiKey = process.env.SERP_API_KEY;
    if (!serpApiKey) {
      return NextResponse.json(
        { error: 'Clé SerpAPI non configurée' },
        { status: 500 }
      );
    }
    await connectToDatabase();

    // Vérifier s'il y a des avis récents (moins de 24h)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentReviews = await Review.find({
      siteId,
      lastUpdated: { $gte: oneWeekAgo }
    }).sort({ lastUpdated: -1 });
    // Si des avis récents existent, les retourner
    if (recentReviews.length > 0) {
      const averageRating = recentReviews.reduce((sum, review) => sum + review.rating, 0) / recentReviews.length;

      // Transformer les avis pour le frontend (mapper authorImage -> imgSrc, author -> by)
      const transformedReviews = recentReviews.map(review => ({
        id: review._id.toString(),
        testimonial: review.testimonial,
        by: review.author,
        imgSrc: review.authorImage,
        rating: review.rating,
        date: review.date,
        source: 'Google'
      }));
      
      const response = {
        reviews: transformedReviews,
        totalReviews: recentReviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        source: 'Google',
        lastUpdated: recentReviews[0].lastUpdated
      };

      return NextResponse.json(response);
    } else {

    }

    // Récupérer les avis depuis SerpAPI
    const serpApiUrl = 'https://serpapi.com/search.json';
    const params = new URLSearchParams({
      engine: 'google_maps_reviews',
      place_id: placeId,
      api_key: serpApiKey,
      hl: 'fr',
      sort_by: 'newest'
    });

    const fullUrl = `${serpApiUrl}?${params}`;

    // Fonction utilitaire pour extraire les avis d'une réponse SerpAPI
    const extractReviewsFromResponse = (data: SerpApiResponse): SerpApiReview[] => {
      if (data.reviews) {
        return data.reviews;
      }
      if (data.place_results?.reviews) {
        return data.place_results.reviews;
      }
      return [];
    };

    // Fonction récursive pour parcourir la pagination SerpAPI
    const fetchAllReviews = async (
      url: string,
      collected: SerpApiReview[] = []
    ): Promise<SerpApiReview[]> => {
      // Si on a déjà assez d'avis, on arrête
      if (collected.length >= limit) {
        return collected.slice(0, limit);
      }

      // S'assurer que la clé API utilisée est toujours la bonne, même sur les URLs de pagination
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set('api_key', serpApiKey);
      const finalUrl = parsedUrl.toString();

      const serpHttpResponse = await fetch(finalUrl);

      if (!serpHttpResponse.ok) {
        const errorText = await serpHttpResponse.text();
        console.error('❌ [SERP API] Réponse non OK:', serpHttpResponse.status, errorText);
        throw new Error(`Erreur SerpAPI: ${serpHttpResponse.status} ${serpHttpResponse.statusText}`);
      }

      const data: SerpApiResponse = await serpHttpResponse.json();

      if (data.error) {
        throw new Error(`Erreur SerpAPI: ${data.error}`);
      }

      const pageReviews = extractReviewsFromResponse(data);
      const newCollected = [...collected, ...pageReviews];

      // Si on a atteint la limite ou qu'il n'y a plus de page suivante, on retourne
      const nextUrl = data.serpapi_pagination?.next;
      if (!nextUrl || newCollected.length >= limit) {
        return newCollected.slice(0, limit);
      }

      // Appel récursif sur la page suivante
      return fetchAllReviews(nextUrl, newCollected);
    };

    // Récupérer toutes les pages d'avis jusqu'à atteinte de la limite
    const allReviews: SerpApiReview[] = await fetchAllReviews(fullUrl);

    // Après le premier appel (fetchAllReviews a forcément appelé au moins une fois l'API),
    // on recharge une réponse SerpAPI pour extraire les stats globales du lieu (rating, total reviews, etc.)
    try {
      const statsResponse = await fetch(fullUrl);
      if (statsResponse.ok) {
        const statsData: SerpApiResponse = await statsResponse.json();

        const placeTitle = statsData.place_results?.title;
        const placeAddress = statsData.place_results?.address;
        const placeRating = statsData.place_results?.rating;
        const placeTotalReviews =
          statsData.place_results?.user_ratings_total ??
          (Array.isArray(statsData.place_results?.reviews)
            ? statsData.place_results?.reviews.length
            : (statsData as any)?.place_results?.reviews);

        await ReviewStats.findOneAndUpdate(
          { siteId, placeId },
          {
            siteId,
            placeId,
            title: placeTitle,
            address: placeAddress,
            averageRating: placeRating ?? 0,
            totalReviews: placeTotalReviews ?? allReviews.length,
            type: statsData.place_results?.type,
            source: 'serpapi',
            lastUpdated: new Date(),
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      }
    } catch (error) {
      console.error('❌ [SERP API] Erreur lors de la sauvegarde des stats globales:', error);
    }

    // Si aucun avis n'a été trouvé sur toutes les pages
    if (allReviews.length === 0) {
      return NextResponse.json({
        reviews: [],
        totalReviews: 0,
        averageRating: 0,
        source: 'Google - Aucun avis trouvé',
        lastUpdated: new Date()
      });
    }

    // Limiter le nombre d'avis
    const limitedReviews = allReviews.slice(0, limit);

    // Sauvegarder les avis en base de données
    const savedReviews = [];
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const review of limitedReviews) {
      try {
        // Nettoyer et valider les données de l'avis
        const cleanReview = {
          snippet: review.snippet || '',
          author: review.author || review.user?.name || 'Anonyme',
          author_image:
            review.author_image ||
            review.user?.thumbnail ||
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          rating: review.rating || 5,
          date: review.iso_date
            ? new Date(review.iso_date).toISOString().split('T')[0]
            : review.date || new Date().toISOString().split('T')[0],
          review_id: review.review_id || null
        };

        // Créer un ID unique pour l'avis
        const reviewId =
          cleanReview.review_id || `${placeId}_${cleanReview.author}_${cleanReview.date}`;

        // Upsert (mise à jour ou création) pour éviter les erreurs de doublon
        const updatedReview = await Review.findOneAndUpdate(
          { siteId, reviewId },
          {
            siteId,
            reviewId,
            testimonial: cleanReview.snippet,
            author: cleanReview.author,
            authorImage: cleanReview.author_image,
            rating: cleanReview.rating,
            date: cleanReview.date,
            source: 'google',
            placeId,
            lastUpdated: new Date()
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );

        if (updatedReview) {
          savedReviews.push(updatedReview);
          // On ne se prend pas la tête à distinguer créé/mis à jour,
          // mais on garde les compteurs si besoin de debug
          // (Mongo ne renvoie pas facilement l'info sans rawResult)
          savedCount++;
        }
      } catch (error: any) {
        // Si c'est un doublon malgré tout, on log en debug et on continue
        if (error?.code === 11000) {
          console.warn(
            '⚠️ [Google] Avis déjà existant (doublon ignoré) pour siteId/reviewId :',
            siteId
          );
        } else {
          console.error(`❌ [Google] Erreur lors de la sauvegarde de l'avis:`, error);
        }
        errorCount++;
        // Continuer avec les autres avis même si un échoue
      }
    }


    const averageRating = savedReviews.length > 0 
      ? savedReviews.reduce((sum, review) => sum + review.rating, 0) / savedReviews.length 
      : 0;

    // Transformer les avis pour le frontend (mapper authorImage -> imgSrc, author -> by)
    const transformedReviews = savedReviews.map(review => ({
      id: review._id.toString(),
      testimonial: review.testimonial,
      by: review.author,
      imgSrc: review.authorImage,
      rating: review.rating,
      date: review.date,
      source: 'Google'
    }));

    const response = {
      reviews: transformedReviews,
      totalReviews: savedReviews.length,
      averageRating: savedReviews.length > 0 ? Math.round(averageRating * 10) / 10 : 0,
      source: 'Google',
      lastUpdated: new Date()
    };



    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}
