import cron from "node-cron";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { getAllTargets, insertCheck, getLastTwoChecks } from "./db";

type Target = { id: number; name: string; url: string };

const snsClient = new SNSClient({ region: process.env.AWS_REGION || "eu-west-1" });

const sendDownAlert = async (name: string, url: string): Promise<void> => {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) return;

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: `[MUDE Monitor] ${name} is DOWN`,
        Message: [
          `Platform DOWN detected`,
          ``,
          `Service : ${name}`,
          `URL     : ${url}`,
          `Time    : ${new Date().toISOString()}`,
          ``,
          `Dashboard: http://${process.env.EC2_HOST || "localhost"}:3000`,
        ].join("\n"),
      })
    );
  } catch (err) {
    console.error(`[SNS] Failed to send alert for ${name}:`, err);
  }
};

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

  const lastTwo = getLastTwoChecks(target.id);
  const current = lastTwo[0];
  const previous = lastTwo[1];

  const justWentDown =
    current?.is_up === 0 &&
    (previous === undefined || previous.is_up === 1);

  if (justWentDown) {
    console.log(`[${target.name}] Transition UP -> DOWN, sending alert`);
    await sendDownAlert(target.name, target.url);
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
