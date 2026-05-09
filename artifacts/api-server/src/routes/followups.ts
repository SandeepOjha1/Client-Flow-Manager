import { Router, type IRouter } from "express";
import { FollowupModel, ActivityModel, LeadModel, getNextId } from "@workspace/db";
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

  const followups = await FollowupModel.find({ leadId: params.data.id }).sort({ dueDate: 1 }).lean();
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

  const id = await getNextId("followups");
  const followup = await new FollowupModel({
    id,
    leadId: params.data.id,
    description: parsed.data.description,
    dueDate: new Date(parsed.data.dueDate),
  }).save();
  const plain = followup.toObject();

  const lead = await LeadModel.findOne({ id: params.data.id }, { name: 1 }).lean();

  await new ActivityModel({
    id: await getNextId("activity"),
    type: "followup_scheduled",
    message: `Follow-up scheduled for "${lead?.name ?? "lead"}"`,
    leadId: params.data.id,
  }).save();

  res.status(201).json(plain);
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

  const followup = await FollowupModel.findOneAndUpdate(
    { id: params.data.followupId },
    { $set: updateData },
    { new: true },
  ).lean();

  if (!followup) {
    res.status(404).json({ error: "Not Found", message: "Follow-up not found" });
    return;
  }

  if (parsed.data.completed) {
    const lead = await LeadModel.findOne({ id: params.data.id }, { name: 1 }).lean();
    await new ActivityModel({
      id: await getNextId("activity"),
      type: "followup_completed",
      message: `Follow-up completed for "${lead?.name ?? "lead"}"`,
      leadId: params.data.id,
    }).save();
  }

  res.json(followup);
});

router.delete("/leads/:id/followups/:followupId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const followup = await FollowupModel.findOneAndDelete({ id: params.data.followupId }).lean();
  if (!followup) {
    res.status(404).json({ error: "Not Found", message: "Follow-up not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
