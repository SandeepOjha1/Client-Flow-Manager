import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { UserModel, getNextId } from "@workspace/db";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email }).lean();

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    res.status(400).json({ error: "Bad Request", message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = await getNextId("users");
  const user = await new UserModel({ id, name, email, passwordHash, role: "admin" }).save();
  const plain = user.toObject();

  const token = signToken({ userId: plain.id, email: plain.email, role: plain.role });
  res.status(201).json({
    token,
    user: {
      id: plain.id,
      name: plain.name,
      email: plain.email,
      role: plain.role,
      createdAt: plain.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = await UserModel.findOne({ id: req.user!.userId }).lean();

  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});

export default router;
