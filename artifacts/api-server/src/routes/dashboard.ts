import { Router, type IRouter } from "express";
import { eq, count, sql, lt, and, gte, desc, asc } from "drizzle-orm";
import { db, leadsTable, followupsTable, activityTable } from "@workspace/db";
import { GetRecentActivityQueryParams, GetUpcomingFollowupsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    statusBreakdownRows,
    sourceBreakdownRows,
    [{ totalPipelineValue }],
    [{ pendingFollowups }],
    [{ overdueFollowups }],
    [{ leadsThisMonth }],
    [{ leadsLastMonth }],
  ] = await Promise.all([
    db
      .select({ status: leadsTable.status, count: count() })
      .from(leadsTable)
      .groupBy(leadsTable.status),
    db
      .select({ source: leadsTable.source, count: count() })
      .from(leadsTable)
      .groupBy(leadsTable.source)
      .orderBy(desc(count())),
    db.select({ totalPipelineValue: sql<number>`COALESCE(SUM(value), 0)` }).from(leadsTable),
    db
      .select({ pendingFollowups: count() })
      .from(followupsTable)
      .where(eq(followupsTable.completed, false)),
    db
      .select({ overdueFollowups: count() })
      .from(followupsTable)
      .where(and(eq(followupsTable.completed, false), lt(followupsTable.dueDate, now))),
    db
      .select({ leadsThisMonth: count() })
      .from(leadsTable)
      .where(gte(leadsTable.createdAt, startOfThisMonth)),
    db
      .select({ leadsLastMonth: count() })
      .from(leadsTable)
      .where(and(gte(leadsTable.createdAt, startOfLastMonth), lt(leadsTable.createdAt, startOfThisMonth))),
  ]);

  const totalLeads = statusBreakdownRows.reduce((sum, r) => sum + Number(r.count), 0);

  const getCount = (status: string) =>
    Number(statusBreakdownRows.find((r) => r.status === status)?.count ?? 0);

  const convertedLeads = getCount("converted");
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  const statusBreakdown = statusBreakdownRows.map((r) => ({
    status: r.status,
    count: Number(r.count),
    percentage: totalLeads > 0 ? (Number(r.count) / totalLeads) * 100 : 0,
  }));

  res.json({
    totalLeads,
    newLeads: getCount("new"),
    contactedLeads: getCount("contacted"),
    convertedLeads,
    lostLeads: getCount("lost"),
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalPipelineValue: Number(totalPipelineValue),
    pendingFollowups: Number(pendingFollowups),
    overdueFollowups: Number(overdueFollowups),
    leadsThisMonth: Number(leadsThisMonth),
    leadsLastMonth: Number(leadsLastMonth),
    statusBreakdown,
    sourceBreakdown: sourceBreakdownRows.map((r) => ({
      source: r.source,
      count: Number(r.count),
    })),
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit : 10;

  const rows = await db
    .select({
      id: activityTable.id,
      type: activityTable.type,
      message: activityTable.message,
      leadId: activityTable.leadId,
      leadName: sql<string>`(SELECT name FROM leads WHERE id = ${activityTable.leadId})`,
      timestamp: activityTable.createdAt,
    })
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(limit ?? 10);

  res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
});

router.get("/dashboard/pipeline", requireAuth, async (req, res): Promise<void> => {
  const STATUSES = ["new", "contacted", "qualified", "proposal", "converted", "lost"];

  const allLeads = await db
    .select()
    .from(leadsTable)
    .orderBy(desc(leadsTable.createdAt));

  const stages = STATUSES.map((status) => {
    const leads = allLeads.filter((l) => l.status === status);
    const value = leads.reduce((sum, l) => sum + (l.value ?? 0), 0);
    return {
      status,
      count: leads.length,
      value,
      leads: leads.map((l) => ({ ...l, notesCount: 0, followupsCount: 0 })),
    };
  });

  const totalValue = allLeads.reduce((sum, l) => sum + (l.value ?? 0), 0);

  res.json({ stages, totalValue, totalLeads: allLeads.length });
});

router.get("/dashboard/upcoming-followups", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetUpcomingFollowupsQueryParams.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit : 5;

  const now = new Date();

  const rows = await db
    .select({
      id: followupsTable.id,
      leadId: followupsTable.leadId,
      description: followupsTable.description,
      dueDate: followupsTable.dueDate,
      completed: followupsTable.completed,
      completedAt: followupsTable.completedAt,
      createdAt: followupsTable.createdAt,
      leadName: sql<string>`(SELECT name FROM leads WHERE id = ${followupsTable.leadId})`,
      leadEmail: sql<string>`(SELECT email FROM leads WHERE id = ${followupsTable.leadId})`,
    })
    .from(followupsTable)
    .where(and(eq(followupsTable.completed, false), gte(followupsTable.dueDate, now)))
    .orderBy(asc(followupsTable.dueDate))
    .limit(limit ?? 5);

  res.json(rows);
});

export default router;
