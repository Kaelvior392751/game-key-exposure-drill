import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const drillInputSchema = z.object({
  projectId: z.string().min(1),
  incidentId: z.string().min(1),
  graceHours: z.number().int().min(0).max(24),
  playerAssets: z.number().int().nonnegative(),
  liveEvents: z.number().int().nonnegative(),
  moderationQueues: z.number().int().nonnegative()
});

export type DrillInput = z.infer<typeof drillInputSchema>;

const createdKeySchema = z.object({ id: z.string().min(1), key: z.string().min(1) });

export type ExposureDecision = {
  severity: "contained" | "high";
  affectedSurfaces: string[];
};

export function assessExposure(input: DrillInput): ExposureDecision {
  const affectedSurfaces = [
    input.playerAssets > 0 ? "player-generated assets" : null,
    input.liveEvents > 0 ? "live events" : null,
    input.moderationQueues > 0 ? "moderation queues" : null
  ].filter((value): value is string => value !== null);

  return {
    severity: input.liveEvents > 0 || input.moderationQueues > 0 ? "high" : "contained",
    affectedSurfaces
  };
}

export async function runLeakedKeyDrill(client: InfraiClient, rawInput: unknown) {
  const input = drillInputSchema.parse(rawInput);
  const decision = assessExposure(input);
  const token = `${input.incidentId}-temporary-key`;

  const created = createdKeySchema.parse(await client.request<unknown>(
    "POST",
    "/v1/account/keys/create",
    {
      project_id: input.projectId,
      name: `leak-drill-${input.incidentId}`,
      idempotency_key: `${token}-create`
    }
  ));

  // The plaintext value exists only in this response. Store it securely if the drill needs it later.
  const plaintextKeyReceived = created.key.length > 0;

  await client.request("POST", `/v1/account/keys/suspected_compromise/${encodeURIComponent(created.id)}`, {
    confirmed_leak: true,
    auto_rotate: false
  });

  await client.request("POST", `/v1/account/keys/rotate/${encodeURIComponent(created.id)}`, {
    grace_hours: input.graceHours,
    idempotency_key: `${token}-rotate`
  });

  const logEvidence = await client.request<unknown>("GET", "/v1/logs/search");

  await client.request("DELETE", `/v1/account/keys/revoke/${encodeURIComponent(created.id)}`);

  return {
    incidentId: input.incidentId,
    temporaryKeyId: created.id,
    plaintextKeyReceived,
    decision,
    confirmation: {
      logsSearched: true,
      evidence: logEvidence
    },
    state: "temporary-key-revoked" as const
  };
}
