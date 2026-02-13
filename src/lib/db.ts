import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = global as unknown as { _mongooseCache?: MongooseCache };
const cached: MongooseCache = globalForMongoose._mongooseCache || { conn: null, promise: null };
globalForMongoose._mongooseCache = cached;

export async function connectToDatabase() {
  if (cached.conn) {
    // Vérifier que la connexion est toujours active
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    } else {
      // Réinitialiser si la connexion est fermée
      cached.conn = null;
      cached.promise = null;
    }
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('❌ MONGODB_URI non défini');
  }

  if (!cached.promise) {
    // Configuration optimisée pour MongoDB Atlas
    mongoose.set('bufferCommands', true); // Permettre le buffering pour éviter les erreurs
    
    // Forcer la connexion à la base de données test
    let uriWithDb;
    // Nettoyer l'URI en supprimant les slashes en fin
    const cleanUri = uri.replace(/\/+$/, '');
    
    if (cleanUri.includes('?')) {
      // Remplacer le ? par test? (sans slash car cleanUri se termine déjà par /)
      uriWithDb = cleanUri.replace('?', 'MajoliHub?');
    } else {
      uriWithDb = cleanUri + '/MajoliHub';
    }
    
    cached.promise = mongoose.connect(uriWithDb, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Attendre que la connexion soit vraiment prête
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
    
    return cached.conn;
  } catch (error) {
    // En cas d'erreur, réinitialiser le cache
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}

export async function disconnectFromDatabase() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
