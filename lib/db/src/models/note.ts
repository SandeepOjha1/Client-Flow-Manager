import mongoose from "mongoose";

export interface INote {
  id: number;
  leadId: number;
  content: string;
  authorId: number;
  createdAt: Date;
}

const noteSchema = new mongoose.Schema<INote>(
  {
    id: { type: Number, required: true, unique: true },
    leadId: { type: Number, required: true, index: true },
    content: { type: String, required: true },
    authorId: { type: Number, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export const NoteModel = mongoose.model<INote>("Note", noteSchema);
