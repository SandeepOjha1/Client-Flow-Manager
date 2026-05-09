import mongoose from "mongoose";

export interface IFollowup {
  id: number;
  leadId: number;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date | null;
  createdAt: Date;
}

const followupSchema = new mongoose.Schema<IFollowup>(
  {
    id: { type: Number, required: true, unique: true },
    leadId: { type: Number, required: true, index: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, required: true, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export const FollowupModel = mongoose.model<IFollowup>("Followup", followupSchema);
