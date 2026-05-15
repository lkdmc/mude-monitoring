import express from "express";
import cors from "cors";
import { initDb } from "./db";
import router from "./routes";
import { startChecker } from "./checker";

const PORT = process.env.PORT || 3001;

const main = async () => {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", router);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
    startChecker();
  });
};

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
