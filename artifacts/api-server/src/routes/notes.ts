import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, notesTable, activityTable } from "@workspace/db";
import { CreateNoteBody, ListNotesParams, CreateNoteParams, DeleteNoteParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leads/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const params = ListNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const notes = await db
    .select({
      id: notesTable.id,
      leadId: notesTable.leadId,
      content: notesTable.content,
      authorId: notesTable.authorId,
      authorName: sql<string>`(SELECT name FROM users WHERE id = ${notesTable.authorId})`,
      createdAt: notesTable.createdAt,
    })
    .from(notesTable)
    .where(eq(notesTable.leadId, params.data.id))
    .orderBy(desc(notesTable.createdAt));

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

  const [note] = await db
    .insert(notesTable)
    .values({
      leadId: params.data.id,
      content: parsed.data.content,
      authorId: req.user!.userId,
    })
    .returning();

  const leadName = await db
    .select({ name: sql<string>`name` })
    .from(sql`leads`)
    .where(sql`id = ${params.data.id}`)
    .limit(1);

  await db.insert(activityTable).values({
    type: "note_added",
    message: `Note added to "${leadName[0]?.name ?? "lead"}"`,
    leadId: params.data.id,
  });

  res.status(201).json({
    ...note,
    authorName: req.user!.email,
  });
});

router.delete("/leads/:id/notes/:noteId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [note] = await db
    .delete(notesTable)
    .where(eq(notesTable.id, params.data.noteId))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Not Found", message: "Note not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
