import { Router, Request, Response } from "express";
import { getAllTargets, getLatestStatus, getHistory, getTargetById } from "./db";

const router = Router();

router.get("/targets", (_req: Request, res: Response) => {
  res.json({ success: true, data: getAllTargets() });
});

router.get("/status", (_req: Request, res: Response) => {
  res.json({ success: true, data: getLatestStatus() });
});

router.get("/history/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid target id" });
    return;
  }
  const target = getTargetById(id);
  if (!target) {
    res.status(404).json({ success: false, error: "Target not found" });
    return;
  }
  res.json({ success: true, data: getHistory(id) });
});

export default router;
