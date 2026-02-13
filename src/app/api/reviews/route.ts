import { NextRequest, NextResponse } from 'next/server';
import { Review } from '@/lib/models/Review';
import { connectToDatabase } from '@/lib/db';

// Types pour les avis
interface Review {
  id: string;
  testimonial: string;
  by: string;
  imgSrc: string;
  rating: number;
  date: string;
  source: 'mock' | 'google' | 'trustpilot' | 'other';
}

interface ReviewsResponse {
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  source: string;
}

// Interface pour les statistiques Google
interface GooglePlaceStats {
  totalReviews: number;
  averageRating: number;
  reviews: Review[];
}

// Fonction pour récupérer les avis Google Places API
async function fetchGoogleReviews(apiKey: string, placeId: string, limit: number = 20): Promise<GooglePlaceStats> {
  try {
    // Essayer de récupérer plus d'avis en utilisant différents paramètres
    let allReviews: any[] = [];

    // Premier appel - récupérer les avis de base
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}&language=fr`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des avis Google');
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Erreur Google API: ${data.status} - ${data.error_message || 'Erreur inconnue'}`);
    }

    // Récupérer les statistiques réelles du lieu
    const totalReviews = data.result.user_ratings_total || 0;
    const averageRating = data.result.rating || 0;

    // Récupérer les avis du premier appel
    allReviews = data.result.reviews || [];

    // Essayer de récupérer plus d'avis avec un deuxième appel (si on en a moins que le total disponible)
    const maxAvailableReviews = Math.min(limit, totalReviews);
    if (allReviews.length < maxAvailableReviews && totalReviews > allReviews.length) {
      try {
        const response2 = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}&reviews_sort=newest&language=fr`
        );

        if (response2.ok) {
          const data2 = await response2.json();
          if (data2.status === 'OK' && data2.result.reviews) {
            // Ajouter les nouveaux avis sans doublons
            const newReviews = data2.result.reviews.filter((newReview: any) =>
              !allReviews.some(existingReview => existingReview.time === newReview.time)
            );
            allReviews = [...allReviews, ...newReviews];
          }
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération d\'avis supplémentaires:', error);
      }
    }

    // Transformer les données Google en format standard SANS traduction
    let reviews = allReviews.map((review: any, index: number) => {
      // Gérer les images de profil Google avec meilleure logique
      const professionalImages = [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
      ];

      let imgSrc = professionalImages[index % professionalImages.length];

      if (review.profile_photo_url) {
        try {
          const photoUrl = new URL(review.profile_photo_url);
          // Vérifier si c'est une URL Google valide
          if (photoUrl.hostname.includes('googleusercontent.com') ||
            photoUrl.hostname.includes('lh3.googleusercontent.com') ||
            photoUrl.hostname.includes('lh4.googleusercontent.com') ||
            photoUrl.hostname.includes('lh5.googleusercontent.com') ||
            photoUrl.hostname.includes('lh6.googleusercontent.com')) {
            imgSrc = review.profile_photo_url;
          } else {
            console.warn(`❌ URL d'image non reconnue pour ${review.author_name}: ${photoUrl.toString()}`);
          }
        } catch (e) {
          console.warn(`❌ URL de photo de profil invalide pour ${review.author_name}:`, review.profile_photo_url);
        }
      } else {
        console.log(`ℹ️ Pas de photo de profil pour ${review.author_name}, utilisation de l'image professionnelle par défaut`);
      }

      // Utiliser le témoignage original SANS traduction
      const testimonial = review.text;

      return {
        id: `google_${index}`,
        testimonial: testimonial,
        by: review.author_name,
        imgSrc,
        rating: review.rating,
        date: new Date(review.time * 1000).toISOString().split('T')[0], // Convertir timestamp en date
        source: "google" as const
      };
    }) || [];

    // Pour Google, on garde seulement les vrais avis (pas d'avis fictifs)
    // Éliminer les doublons basés sur le contenu
    const uniqueReviews = reviews.filter((review, index, self) => {
      const firstIndex = self.findIndex(r =>
        r.by === review.by &&
        r.testimonial === review.testimonial &&
        r.rating === review.rating
      );
      return firstIndex === index;
    });

    // Limiter le nombre d'avis retournés
    const maxReviews = Math.min(limit, totalReviews);
    reviews = uniqueReviews.slice(0, maxReviews);

    console.log(`✅ ${reviews.length} avis Google uniques récupérés pour le lieu ${placeId} (sur ${allReviews.length} avis trouvés)`);

    return {
      totalReviews,
      averageRating,
      reviews
    };

  } catch (error) {
    console.error('Erreur lors de la récupération des avis Google:', error);
    // En cas d'erreur, retourner des avis factices avec des stats par défaut
    return {
      totalReviews: 0,
      averageRating: 0,
      reviews: mockReviews.slice(0, limit).map((review: any, index: number) => ({
        ...review,
        id: `google_fallback_${index}`,
        source: "google" as const
      }))
    };
  }
}

// Fonction pour récupérer les avis Trustpilot (exemple)
async function fetchTrustpilotReviews(apiKey: string, businessId: string): Promise<Review[]> {
  try {
    // Exemple d'implémentation pour Trustpilot API
    // Note: Vous devrez implémenter la vraie logique selon vos besoins
    const response = await fetch(
      `https://api.trustpilot.com/v1/business-units/${businessId}/reviews?apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des avis Trustpilot');
    }

    const data = await response.json();

    // Transformer les données Trustpilot en format standard
    return data.reviews?.map((review: any, index: number) => ({
      id: `trustpilot_${index}`,
      testimonial: review.text,
      by: review.consumer.displayName,
      imgSrc: review.consumer.profileImageUrl || `https://i.pravatar.cc/150?img=${index + 1}`,
      rating: review.stars,
      date: review.createdAt,
      source: "trustpilot" as const
    })) || [];

  } catch (error) {
    console.error('Erreur lors de la récupération des avis Trustpilot:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const limit = parseInt(searchParams.get('limit') || '50');


    if (!siteId) {
      return NextResponse.json(
        { error: 'SiteId est requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Récupérer les avis depuis la base de données
    const reviews = await Review.find({ siteId })
      .sort({ lastUpdated: -1 })
      .limit(limit);

    if (reviews.length === 0) {
      return NextResponse.json({
        reviews: [],
        totalReviews: 0,
        averageRating: 0,
        source: 'Google - Aucun avis trouvé',
        lastUpdated: null
      });
    }

    // Calculer la note moyenne
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    // Transformer les avis pour le frontend (mapper authorImage -> imgSrc, author -> by)
    const transformedReviews = reviews.map(review => ({
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
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      source: 'Google',
      lastUpdated: reviews[0].lastUpdated
    };



    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {


  try {
    const { siteId, placeId, limit = 50, forceRefresh = false } = await request.json();


    if (!siteId) {
      return NextResponse.json(
        { error: 'SiteId est requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Vérifier s'il y a des avis récents (moins de 24h) et si on ne force pas le refresh
    if (!forceRefresh) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentReviews = await Review.find({
        siteId,
        placeId, // Utiliser le placeId pour une mise en cache plus précise
        lastUpdated: { $gte: oneDayAgo }
      }).sort({ lastUpdated: -1 });


      if (recentReviews.length > 0) {
        const averageRating = recentReviews.reduce((sum, review) => sum + review.rating, 0) / recentReviews.length;

        // Transformer les avis pour le frontend
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
    } else {
    }

    // Si pas d'avis récents ou force refresh, récupérer depuis SerpAPI
    if (placeId) {

      const serpApiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reviews/serp`;

      // Appeler l'API SerpAPI
      const serpResponse = await fetch(serpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId, placeId, limit }),
      });


      if (serpResponse.ok) {
        const serpData = await serpResponse.json();
        return NextResponse.json(serpData);
      } else {
        const errorText = await serpResponse.text();
      }
    } else {
    }

    // Fallback: retourner les avis existants même s'ils sont anciens
    const existingReviews = await Review.find({ siteId })
      .sort({ lastUpdated: -1 })
      .limit(limit);


    if (existingReviews.length > 0) {
      const averageRating = existingReviews.reduce((sum, review) => sum + review.rating, 0) / existingReviews.length;

      // Transformer les avis pour le frontend
      const transformedReviews = existingReviews.map(review => ({
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
        totalReviews: existingReviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        source: 'Google (anciens avis)',
        lastUpdated: existingReviews[0].lastUpdated
      };


      return NextResponse.json(response);
    }

    // Aucun avis trouvé
    return NextResponse.json({
      reviews: [],
      totalReviews: 0,
      averageRating: 0,
      source: 'Aucun avis trouvé',
      lastUpdated: null
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
} 