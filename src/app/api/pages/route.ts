import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth/get-user-from-request';
import { getPagesBySiteId } from '@/lib/repositories/page-repositories';
import { IPagePopulated } from '@/lib/models/types/populated';
import "@/lib/models/Bande";
import "@/lib/models/AbstractBande";

export async function POST(
  request: NextRequest,
) {
  try {
     const { siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId requis dans le body' },
        { status: 400 }
      );
    }


    // // Vérifier l'authentification
    // const userFromRequest = getUserFromRequest(request);
    // if (!userFromRequest) {
    //   return NextResponse.json(
    //     { error: 'Non autorisé' },
    //     { status: 401 }
    //   );
    // }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer toutes les pages du site
    const pages = await getPagesBySiteId(siteId);
    if (!pages) {
      return NextResponse.json(
        { error: 'Aucune page trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pages: pages.map((page: IPagePopulated) => ({
        id: (page as any)._id.toString(),
        pageId: page.pageId,
        name: page.name,
        slug: page.slug,
        isHome: page.isHome,
        isPublished: page.isPublished,
        lastUpdated: page.lastUpdated,
        bandes: page.bandes || [],
        seo: {
          title: page.seo?.title || '',
          description: page.seo?.description || '',
          keywords: page.seo?.keywords || ''
        }
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des pages:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pages' },
      { status: 500 }
    );
  }
}