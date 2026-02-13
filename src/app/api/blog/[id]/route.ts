import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Blog } from '@/lib/models/Blog';

// Article complet (avec content) : appelé quand on ouvre une page article après clic sur la liste.
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    await connectToDatabase();

    try {
        const blog = await Blog.findById(id)
        if (!blog) {
            return NextResponse.json({ error: "Aucun article de blog trouvé" }, { status: 404 });
        }
        blog.views += 1;
        await blog.save();
        return NextResponse.json(blog, { status: 200 });
    } catch (err) {
        console.error("Erreur dans getBlog:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
};

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    await connectToDatabase();

    try {
        const blogData = await request.json();

        const blog = await Blog.findByIdAndUpdate(id, blogData, { new: true, runValidators: true });

        if (!blog) {
            return NextResponse.json({ error: "Aucun article de blog trouvé" }, { status: 404 });
        }

        return NextResponse.json(blog, { status: 200 });
    } catch (err) {
        console.error("Erreur dans updateBlog:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    await connectToDatabase();

    try {
        const blog = await Blog.findByIdAndDelete(id);
        return NextResponse.json(blog, { status: 200 });
    } catch (err) {
        console.error("Erreur dans deleteBlog:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    await connectToDatabase();

    try {
        const blogData = await request.json();
        const blog = await Blog.findByIdAndUpdate(id, blogData, { new: true });
        return NextResponse.json(blog, { status: 200 });
    } catch (err) {
        console.error("Erreur dans updateBlog:", err);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}