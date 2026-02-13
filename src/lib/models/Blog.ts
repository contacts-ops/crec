import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlog extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  image: string;
  keywords: string[];
  views: number;
  siteId: string;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, minlength: [3, 'Le titre doit contenir au moins 3 caractères'], maxlength: [100, 'Le titre ne doit pas dépasser 100 caractères'] },
    content: { type: String, required: true, minlength: [10, 'Le contenu doit contenir au moins 10 caractères'] },
    image: { type: String, required: true, minlength: [1, 'L\'image est requise'] },
    keywords: { type: [String], required: true, default: [] },
    views: { type: Number, required: true, default: 0 },
    siteId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Blog: Model<IBlog> = mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);
