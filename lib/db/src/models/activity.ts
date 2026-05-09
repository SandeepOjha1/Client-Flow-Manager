import mongoose from "mongoose";

export interface IActivity {
  id: number;
  type: string;
  message: string;
  leadId: number;
  createdAt: Date;
}

const activitySchema = new mongoose.Schema<IActivity>(
  {
    id: { type: Number, required: true, unique: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    leadId: { type: Number, required: true, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export const ActivityModel = mongoose.model<IActivity>("Activity", activitySchema);
