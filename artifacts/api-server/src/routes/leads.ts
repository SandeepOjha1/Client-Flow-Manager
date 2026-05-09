import { Router, type IRouter } from "express";
import { LeadModel, NoteModel, FollowupModel, ActivityModel, getNextId } from "@workspace/db";
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

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }
  if (status) filter.status = status;
  if (source) filter.source = source;

  const sortField = ["createdAt", "name", "email", "status"].includes(sortBy ?? "") ? sortBy : "createdAt";
  const sortObj: Record<string, 1 | -1> = { [sortField!]: sortOrder === "asc" ? 1 : -1 };

  const [leadsRaw, total] = await Promise.all([
    LeadModel.find(filter).sort(sortObj).skip(offset).limit(limit).lean(),
    LeadModel.countDocuments(filter),
  ]);

  const leadIds = leadsRaw.map((l) => l.id);
  let noteCounts: Record<number, number> = {};
  let followupCounts: Record<number, number> = {};

  if (leadIds.length > 0) {
    const [noteAgg, followupAgg] = await Promise.all([
      NoteModel.aggregate([
        { $match: { leadId: { $in: leadIds } } },
        { $group: { _id: "$leadId", count: { $sum: 1 } } },
      ]),
      FollowupModel.aggregate([
        { $match: { leadId: { $in: leadIds } } },
        { $group: { _id: "$leadId", count: { $sum: 1 } } },
      ]),
    ]);
    noteCounts = Object.fromEntries(noteAgg.map((r) => [r._id, r.count]));
    followupCounts = Object.fromEntries(followupAgg.map((r) => [r._id, r.count]));
  }

  const leads = leadsRaw.map((l) => ({
    ...l,
    notesCount: noteCounts[l.id] ?? 0,
    followupsCount: followupCounts[l.id] ?? 0,
  }));

  res.json({ leads, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const id = await getNextId("leads");
  const lead = await new LeadModel({ id, ...parsed.data, status: parsed.data.status ?? "new" }).save();
  const plain = lead.toObject();

  await new ActivityModel({
    id: await getNextId("activity"),
    type: "lead_created",
    message: `New lead "${plain.name}" was added`,
    leadId: plain.id,
  }).save();

  res.status(201).json({ ...plain, notesCount: 0, followupsCount: 0 });
});

router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const lead = await LeadModel.findOne({ id: params.data.id }).lean();
  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  const [notesRaw, followups] = await Promise.all([
    NoteModel.find({ leadId: params.data.id }).sort({ createdAt: -1 }).lean(),
    FollowupModel.find({ leadId: params.data.id }).sort({ dueDate: 1 }).lean(),
  ]);

  const authorIds = [...new Set(notesRaw.map((n) => n.authorId))];
  const authors = await import("@workspace/db").then(({ UserModel: U }) =>
    U.find({ id: { $in: authorIds } }, { id: 1, name: 1 }).lean()
  );
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));

  const notes = notesRaw.map((n) => ({ ...n, authorName: authorMap[n.authorId] ?? "" }));

  res.json({
    ...lead,
    notesCount: notes.length,
    followupsCount: followups.length,
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

  const lead = await LeadModel.findOneAndUpdate(
    { id: params.data.id },
    { $set: parsed.data },
    { new: true },
  ).lean();

  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  const [notesCount, followupsCount] = await Promise.all([
    NoteModel.countDocuments({ leadId: lead.id }),
    FollowupModel.countDocuments({ leadId: lead.id }),
  ]);

  res.json({ ...lead, notesCount, followupsCount });
});

router.delete("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const lead = await LeadModel.findOneAndDelete({ id: params.data.id }).lean();
  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  await Promise.all([
    NoteModel.deleteMany({ leadId: params.data.id }),
    FollowupModel.deleteMany({ leadId: params.data.id }),
    ActivityModel.deleteMany({ leadId: params.data.id }),
  ]);

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

  const lead = await LeadModel.findOneAndUpdate(
    { id: params.data.id },
    { $set: { status: parsed.data.status } },
    { new: true },
  ).lean();

  if (!lead) {
    res.status(404).json({ error: "Not Found", message: "Lead not found" });
    return;
  }

  await new ActivityModel({
    id: await getNextId("activity"),
    type: "lead_status_changed",
    message: `"${lead.name}" status changed to ${parsed.data.status}`,
    leadId: lead.id,
  }).save();

  const [notesCount, followupsCount] = await Promise.all([
    NoteModel.countDocuments({ leadId: lead.id }),
    FollowupModel.countDocuments({ leadId: lead.id }),
  ]);

  res.json({ ...lead, notesCount, followupsCount });
});

export default router;
