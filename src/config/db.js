import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    const message = [
      "MongoDB connection failed.",
      "Check MONGODB_URI, Atlas Network Access IP whitelist, and database user credentials.",
      `Original error: ${error.message}`,
    ].join(" ");

    throw new Error(message);
  }
}
