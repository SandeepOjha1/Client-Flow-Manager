import { Router, type IRouter } from "express";
import { NoteModel, ActivityModel, UserModel, LeadModel, getNextId } from "@workspace/db";
import { CreateNoteBody, ListNotesParams, CreateNoteParams, DeleteNoteParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leads/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const params = ListNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const notesRaw = await NoteModel.find({ leadId: params.data.id }).sort({ createdAt: -1 }).lean();

  const authorIds = [...new Set(notesRaw.map((n) => n.authorId))];
  const authors = await UserModel.find({ id: { $in: authorIds } }, { id: 1, name: 1 }).lean();
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));

  const notes = notesRaw.map((n) => ({ ...n, authorName: authorMap[n.authorId] ?? "" }));
  res.json(notes);
});

router.post("/leads/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const params = CreateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const id = await getNextId("notes");
  const note = await new NoteModel({
    id,
    leadId: params.data.id,
    content: parsed.data.content,
    authorId: req.user!.userId,
  }).save();
  const plain = note.toObject();

  const [lead, author] = await Promise.all([
    LeadModel.findOne({ id: params.data.id }, { name: 1 }).lean(),
    UserModel.findOne({ id: req.user!.userId }, { name: 1 }).lean(),
  ]);

  await new ActivityModel({
    id: await getNextId("activity"),
    type: "note_added",
    message: `Note added to "${lead?.name ?? "lead"}"`,
    leadId: params.data.id,
  }).save();

  res.status(201).json({ ...plain, authorName: author?.name ?? req.user!.email });
});

router.delete("/leads/:id/notes/:noteId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const note = await NoteModel.findOneAndDelete({ id: params.data.noteId }).lean();
  if (!note) {
    res.status(404).json({ error: "Not Found", message: "Note not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
