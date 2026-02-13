import mongoose from "mongoose";

const cached = (global as any)._mongooseCached || { conn: null, promise: null };
(global as any)._mongooseCached = cached;

export async function connectToDatabase() {
    if (cached.conn) return cached.conn; // déjà connecté

    if (!cached.promise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("❌ MONGODB_URI non défini");

        // Forcer la connexion à la base de données test
        let uriWithDb = "";
        // Nettoyer l'URI en supprimant les slashes en fin
        const cleanUri = uri.replace(/\/+$/, '');
        
        if (cleanUri.includes('?')) {
          // Remplacer le ? par test? (sans slash car cleanUri se termine déjà par /)
          uriWithDb = cleanUri.replace('?', 'MajoliHub?');
        } else {
          uriWithDb = cleanUri + '/MajoliHub';
        }

        cached.promise = mongoose.connect(uriWithDb, {
            bufferCommands: true, // Permettre le buffering pour éviter les erreurs
        }).then((mongoose) => mongoose);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
