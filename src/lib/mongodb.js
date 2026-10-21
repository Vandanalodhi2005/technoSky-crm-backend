
import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI?.trim();

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Configure it in backend/my-app/.env.local."
    );
  }

  if (!/^mongodb(?:\+srv)?:\/\//.test(MONGODB_URI)) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://."
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI)
      .then((mongooseInstance) => mongooseInstance)
      .catch((error) => {
        cached.promise = null;
        console.error(
          "MongoDB connection failed:",
          error instanceof Error ? error.name : "UnknownError"
        );
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
