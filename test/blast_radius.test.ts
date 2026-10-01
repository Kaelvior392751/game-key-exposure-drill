import assert from "node:assert/strict";
import test from "node:test";
import { assessExposure, drillInputSchema } from "../src/leaked_key_drill.js";

test("an active moderation queue makes the response high severity", () => {
  const input = drillInputSchema.parse({
    projectId: "game-backend",
    incidentId: "incident-42",
    graceHours: 1,
    playerAssets: 18,
    liveEvents: 0,
    moderationQueues: 4
  });

  assert.deepEqual(assessExposure(input), {
    severity: "high",
    affectedSurfaces: ["player-generated assets", "moderation queues"]
  });
});
