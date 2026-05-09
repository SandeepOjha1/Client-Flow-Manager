import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required. Please set it to your MongoDB connection string.");
}

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGODB_URI as string);
}

export { mongoose };
export * from "./models/counter";
export * from "./models/user";
export * from "./models/lead";
export * from "./models/note";
export * from "./models/followup";
export * from "./models/activity";
