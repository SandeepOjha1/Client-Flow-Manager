import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, followupsTable, activityTable } from "@workspace/db";
import {
  CreateFollowupBody,
  UpdateFollowupBody,
  ListFollowupsParams,
  CreateFollowupParams,
  UpdateFollowupParams,
  DeleteFollowupParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leads/:id/followups", requireAuth, async (req, res): Promise<void> => {
  const params = ListFollowupsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const followups = await db
    .select()
    .from(followupsTable)
    .where(eq(followupsTable.leadId, params.data.id))
    .orderBy(asc(followupsTable.dueDate));

  res.json(followups);
});

router.post("/leads/:id/followups", requireAuth, async (req, res): Promise<void> => {
  const params = CreateFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const parsed = CreateFollowupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [followup] = await db
    .insert(followupsTable)
    .values({
      leadId: params.data.id,
      description: parsed.data.description,
      dueDate: new Date(parsed.data.dueDate),
    })
    .returning();

  const [leadRow] = await db
    .select({ name: sql<string>`name` })
    .from(sql`leads`)
    .where(sql`id = ${params.data.id}`);

  await db.insert(activityTable).values({
    type: "followup_scheduled",
    message: `Follow-up scheduled for "${leadRow?.name ?? "lead"}"`,
    leadId: params.data.id,
  });

  res.status(201).json(followup);
});

router.patch("/leads/:id/followups/:followupId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const parsed = UpdateFollowupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.dueDate != null) updateData.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.completed != null) {
    updateData.completed = parsed.data.completed;
    updateData.completedAt = parsed.data.completed ? new Date() : null;
  }

  const [followup] = await db
    .update(followupsTable)
    .set(updateData)
    .where(eq(followupsTable.id, params.data.followupId))
    .returning();

  if (!followup) {
    res.status(404).json({ error: "Not Found", message: "Follow-up not found" });
    return;
  }

  if (parsed.data.completed) {
    const [leadRow] = await db
      .select({ name: sql<string>`name` })
      .from(sql`leads`)
      .where(sql`id = ${params.data.id}`);

    await db.insert(activityTable).values({
      type: "followup_completed",
      message: `Follow-up completed for "${leadRow?.name ?? "lead"}"`,
      leadId: params.data.id,
    });
  }

  res.json(followup);
});

router.delete("/leads/:id/followups/:followupId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [followup] = await db
    .delete(followupsTable)
    .where(eq(followupsTable.id, params.data.followupId))
    .returning();

  if (!followup) {
    res.status(404).json({ error: "Not Found", message: "Follow-up not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
