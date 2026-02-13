import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Blog } from '@/lib/models/Blog';

export async function GET(request: Request) {
    await connectToDatabase();
    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId') || undefined;
        const pageParam = searchParams.get('page');
        const limitParam = searchParams.get('limit');
        const skipParam = searchParams.get('skip');
        const searchTerm = searchParams.get('search') || '';
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const hasPaginationParams = !!(pageParam || limitParam || skipParam);

        const query: Record<string, any> = {};
        if (siteId) query.siteId = siteId;

        // Ajouter le filtrage par terme de recherche
        if (searchTerm) {
            query.$or = [
                { title: { $regex: searchTerm, $options: 'i' } },
                { content: { $regex: searchTerm, $options: 'i' } },
                { keywords: { $in: [new RegExp(searchTerm, 'i')] } }
            ];
        }

        // Définir le tri
        const sortOptions: Record<string, any> = {};
        switch (sortBy) {
            case 'title':
                sortOptions.title = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'views':
                sortOptions.views = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'updatedAt':
                sortOptions.updatedAt = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'createdAt':
            default:
                sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
                break;
        }
        // Ajouter _id comme critère de tri secondaire pour garantir un ordre stable
        sortOptions._id = -1;

        if (hasPaginationParams) {
            const limit = Math.max(1, parseInt(limitParam || '10', 10));
            const page = Math.max(1, parseInt(pageParam || '1', 10));
            const skip = skipParam !== null ? Math.max(0, parseInt(skipParam, 10)) : (page - 1) * limit;

            const [blogs, total] = await Promise.all([
                Blog.find(query)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Blog.countDocuments(query),
            ]);

            return NextResponse.json({
                data: blogs,
                pagination: {
                    total,
                    page,
                    limit,
                    skip,
                    pages: Math.ceil(total / limit),
                },
            }, { status: 200 });
        }

        // Rétrocompatibilité: renvoyer tout si pas de pagination demandée
        const blogs = await Blog.find(query)
            .sort(sortOptions)
            .lean();
        return NextResponse.json(blogs, { status: 200 });
    } catch (err) {
        console.error("Erreur dans getBlogs:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await connectToDatabase();
        const blogData = await request.json();
        
        // Validation du siteId
        if (!blogData.siteId) {
            return NextResponse.json({ error: "Le siteId est requis" }, { status: 400 });
        }
        
        const newBlog = await Blog.create(blogData);

        return NextResponse.json(newBlog, { status: 201 });
    } catch (err) {
        console.error("Erreur dans createBlog:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}

