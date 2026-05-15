import cron from "node-cron";
import { getAllTargets, insertCheck } from "./db";

type Target = { id: number; name: string; url: string };

const checkTarget = async (target: Target): Promise<void> => {
  const start = Date.now();
  try {
    const response = await fetch(target.url, { signal: AbortSignal.timeout(10000) });
    const responseTimeMs = Date.now() - start;
    insertCheck(target.id, response.status, responseTimeMs, response.ok);
    console.log(`[${target.name}] ${response.status} - ${responseTimeMs}ms`);
  } catch {
    const responseTimeMs = Date.now() - start;
    insertCheck(target.id, null, responseTimeMs, false);
    console.log(`[${target.name}] DOWN - ${responseTimeMs}ms`);
  }
};

const runChecks = async (): Promise<void> => {
  const targets = getAllTargets() as Target[];
  await Promise.all(targets.map(checkTarget));
};

export const startChecker = (): void => {
  runChecks();
  cron.schedule("*/5 * * * *", runChecks);
  console.log("Checker started — polling every 5 minutes");
};
