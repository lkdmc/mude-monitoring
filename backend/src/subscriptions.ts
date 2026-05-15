import {
  SNSClient,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";
import fs from "fs";
import path from "path";

const snsClient = new SNSClient({ region: process.env.AWS_REGION || "eu-west-1" });

export const syncSubscriptions = async (): Promise<void> => {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.log("[Subscriptions] SNS_TOPIC_ARN not set, skipping sync");
    return;
  }

  const alertsFile = path.join(__dirname, "../alerts.json");
  const desired: string[] = JSON.parse(fs.readFileSync(alertsFile, "utf-8"));

  const response = await snsClient.send(
    new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })
  );
  const current = (response.Subscriptions || []).filter(
    (s) => s.Protocol === "email"
  );

  const confirmedEmails = current
    .filter((s) => s.SubscriptionArn !== "PendingConfirmation")
    .map((s) => ({ email: s.Endpoint!, arn: s.SubscriptionArn! }));

  const allCurrentEmails = current.map((s) => s.Endpoint!);

  for (const email of desired) {
    if (!allCurrentEmails.includes(email)) {
      await snsClient.send(
        new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: "email",
          Endpoint: email,
        })
      );
      console.log(`[Subscriptions] Subscribed ${email} — awaiting confirmation`);
    }
  }

  for (const { email, arn } of confirmedEmails) {
    if (!desired.includes(email)) {
      await snsClient.send(new UnsubscribeCommand({ SubscriptionArn: arn }));
      console.log(`[Subscriptions] Unsubscribed ${email}`);
    }
  }

  console.log(`[Subscriptions] Sync complete — active: ${desired.join(", ")}`);
};
