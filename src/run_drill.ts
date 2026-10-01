import { InfraiClient } from "./infrai_client.js";
import { runLeakedKeyDrill } from "./leaked_key_drill.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

const result = await runLeakedKeyDrill(new InfraiClient(apiKey), {
  projectId: process.env.INFRAI_PROJECT_ID ?? "game-backend",
  incidentId: `drill-${new Date().toISOString().slice(0, 10)}`,
  graceHours: 1,
  playerAssets: 240,
  liveEvents: 2,
  moderationQueues: 3
});

console.log(JSON.stringify(result, null, 2));
