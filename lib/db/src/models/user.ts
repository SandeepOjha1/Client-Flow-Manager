import mongoose from "mongoose";

export interface IUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: "agent" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

export const UserModel = mongoose.model<IUser>("User", userSchema);
