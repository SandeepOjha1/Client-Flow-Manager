import { Router, type IRouter } from "express";
import { LeadModel, FollowupModel, ActivityModel } from "@workspace/db";
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
    pipelineAgg,
    pendingFollowups,
    overdueFollowups,
    leadsThisMonth,
    leadsLastMonth,
  ] = await Promise.all([
    LeadModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    LeadModel.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    LeadModel.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$value", 0] } } } }]),
    FollowupModel.countDocuments({ completed: false }),
    FollowupModel.countDocuments({ completed: false, dueDate: { $lt: now } }),
    LeadModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
    LeadModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
  ]);

  const totalLeads = statusBreakdownRows.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
  const getCount = (status: string) =>
    statusBreakdownRows.find((r: { _id: string }) => r._id === status)?.count ?? 0;

  const convertedLeads = getCount("converted");
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const totalPipelineValue = pipelineAgg[0]?.total ?? 0;

  const statusBreakdown = statusBreakdownRows.map((r: { _id: string; count: number }) => ({
    status: r._id,
    count: r.count,
    percentage: totalLeads > 0 ? (r.count / totalLeads) * 100 : 0,
  }));

  res.json({
    totalLeads,
    newLeads: getCount("new"),
    contactedLeads: getCount("contacted"),
    convertedLeads,
    lostLeads: getCount("lost"),
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalPipelineValue,
    pendingFollowups,
    overdueFollowups,
    leadsThisMonth,
    leadsLastMonth,
    statusBreakdown,
    sourceBreakdown: sourceBreakdownRows.map((r: { _id: string; count: number }) => ({
      source: r._id,
      count: r.count,
    })),
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

  const rows = await ActivityModel.aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "leads",
        localField: "leadId",
        foreignField: "id",
        as: "lead",
      },
    },
    {
      $addFields: {
        leadName: { $arrayElemAt: ["$lead.name", 0] },
        timestamp: "$createdAt",
      },
    },
    { $project: { lead: 0, __v: 0 } },
  ]);

  res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
});

router.get("/dashboard/pipeline", requireAuth, async (req, res): Promise<void> => {
  const STATUSES = ["new", "contacted", "qualified", "proposal", "converted", "lost"];

  const allLeads = await LeadModel.find().sort({ createdAt: -1 }).lean();

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
  const limit = parsed.success ? (parsed.data.limit ?? 5) : 5;

  const now = new Date();

  const rows = await FollowupModel.aggregate([
    { $match: { completed: false, dueDate: { $gte: now } } },
    { $sort: { dueDate: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "leads",
        localField: "leadId",
        foreignField: "id",
        as: "lead",
      },
    },
    {
      $addFields: {
        leadName: { $arrayElemAt: ["$lead.name", 0] },
        leadEmail: { $arrayElemAt: ["$lead.email", 0] },
      },
    },
    { $project: { lead: 0, __v: 0 } },
  ]);

  res.json(rows);
});

export default router;
