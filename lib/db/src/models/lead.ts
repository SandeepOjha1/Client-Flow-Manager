import mongoose from "mongoose";

export interface ILead {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source: string;
  status: string;
  value?: number | null;
  assignedTo?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new mongoose.Schema<ILead>(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    company: { type: String, default: null },
    source: { type: String, required: true },
    status: { type: String, required: true, default: "new" },
    value: { type: Number, default: null },
    assignedTo: { type: Number, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ name: "text", email: "text", company: "text" });

export const LeadModel = mongoose.model<ILead>("Lead", leadSchema);
