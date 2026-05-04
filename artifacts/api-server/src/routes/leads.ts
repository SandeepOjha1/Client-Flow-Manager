import { Router, type IRouter } from "express";
import { eq, ilike, and, count, sql, desc, asc } from "drizzle-orm";
import { db, leadsTable, notesTable, followupsTable, activityTable } from "@workspace/db";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  UpdateLeadBody,
  UpdateLeadStatusBody,
  GetLeadParams,
  UpdateLeadParams,
  DeleteLeadParams,
  UpdateLeadStatusParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { page, limit, search, status, source, sortBy, sortOrder } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${ilike(leadsTable.name, `%${search}%`)} OR ${ilike(leadsTable.email, `%${search}%`)} OR ${ilike(leadsTable.company ?? leadsTable.company, `%${search}%`)})`
    );
  }
  if (status) conditions.push(eq(leadsTable.status, status));
  if (source) conditions.push(eq(leadsTable.source, source));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderMap: Record<string, any> = {
    createdAt: leadsTable.createdAt,
    name: leadsTable.name,
    email: leadsTable.email,
    status: leadsTable.status,
  };
  const orderCol = orderMap[sortBy] ?? leadsTable.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [leadsRaw, [{ total }]] = await Promise.all([
    db
      .select()
      .from(leadsTable)
      .where(whereClause)
      .orderBy(orderFn(orderCol))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(leadsTable).where(whereClause),
  ]);

  const leadIds = leadsRaw.map((l) => l.id);
  let noteCounts: Record<number, number> = {};
  let followupCounts: Record<number, number> = {};

  if (leadIds.length > 0) {
    const noteCountRows = await db
      .select({ leadId: notesTable.leadId, cnt: count() })
      .from(notesTable)
      .where(sql`${notesTable.leadId} = ANY(${sql.raw(`ARRAY[${leadIds.join(",")}]`)})`)
      .groupBy(notesTable.leadId);
    const followupCountRows = await db
      .select({ leadId: followupsTable.leadId, cnt: count() })
      .from(followupsTable)
      .where(sql`${followupsTable.leadId} = ANY(${sql.raw(`ARRAY[${leadIds.join(",")}]`)})`)
      .groupBy(followupsTable.leadId);

    noteCounts = Object.fromEntries(noteCountRows.map((r) => [r.leadId, Number(r.cnt)]));
    followupCounts = Object.fromEntries(followupCountRows.map((r) => [r.leadId, Number(r.cnt)]));
  }

  const leads = leadsRaw.map((l) => ({
    ...l,
    notesCount: noteCounts[l.id] ?? 0,
    followupsCount: followupCounts[l.id] ?? 0,
  }));

  res.json({
    leads,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
});

router.post("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({ ...parsed.data, status: parsed.data.status ?? "new" })
    .returning();

  await db.insert(activityTable).values({
    type: "lead_created",
    message: `New lead "${lead.name}" was added`,
    leadId: lead.id,
  });

  res.status(201).json({ ...lead, notesCount: 0, followupsCount: 0 });
});

router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id));

  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  const [notes, followups, [{ notesCount }], [{ followupsCount }]] = await Promise.all([
    db
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
      .orderBy(desc(notesTable.createdAt)),
    db
      .select()
      .from(followupsTable)
      .where(eq(followupsTable.leadId, params.data.id))
      .orderBy(asc(followupsTable.dueDate)),
    db.select({ notesCount: count() }).from(notesTable).where(eq(notesTable.leadId, params.data.id)),
    db.select({ followupsCount: count() }).from(followupsTable).where(eq(followupsTable.leadId, params.data.id)),
  ]);

  res.json({
    ...lead,
    notesCount: Number(notesCount),
    followupsCount: Number(followupsCount),
    notes,
    followups,
  });
});

router.put("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [lead] = await db
    .update(leadsTable)
    .set(parsed.data)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  const [[{ notesCount }], [{ followupsCount }]] = await Promise.all([
    db.select({ notesCount: count() }).from(notesTable).where(eq(notesTable.leadId, lead.id)),
    db.select({ followupsCount: count() }).from(followupsTable).where(eq(followupsTable.leadId, lead.id)),
  ]);

  res.json({ ...lead, notesCount: Number(notesCount), followupsCount: Number(followupsCount) });
});

router.delete("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [lead] = await db
    .delete(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/leads/:id/status", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeadStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const parsed = UpdateLeadStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [lead] = await db
    .update(leadsTable)
    .set({ status: parsed.data.status })
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  await db.insert(activityTable).values({
    type: "lead_status_changed",
    message: `"${lead.name}" status changed to ${parsed.data.status}`,
    leadId: lead.id,
  });

  const [[{ notesCount }], [{ followupsCount }]] = await Promise.all([
    db.select({ notesCount: count() }).from(notesTable).where(eq(notesTable.leadId, lead.id)),
    db.select({ followupsCount: count() }).from(followupsTable).where(eq(followupsTable.leadId, lead.id)),
  ]);

  res.json({ ...lead, notesCount: Number(notesCount), followupsCount: Number(followupsCount) });
});

export default router;
