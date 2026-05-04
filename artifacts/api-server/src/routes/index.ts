import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import notesRouter from "./notes";
import followupsRouter from "./followups";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(leadsRouter);
router.use(notesRouter);
router.use(followupsRouter);
router.use(dashboardRouter);

export default router;
