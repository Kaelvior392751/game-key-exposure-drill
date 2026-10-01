import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.js";
import { runLeakedKeyDrill } from "./leaked_key_drill.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

const client = new InfraiClient(apiKey);
const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/drills") {
    return send(response, 404, { error: "route not found" });
  }

  try {
    const result = await runLeakedKeyDrill(client, await readJson(request));
    return send(response, 200, result);
  } catch (error) {
    if (error instanceof ZodError) return send(response, 400, { error: "invalid request", issues: error.issues });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return send(response, status, { error: error.code, detail: error.detail });
    }
    return send(response, 502, { error: "drill could not be completed" });
  }
}).listen(port, () => console.log(`Leaked-key drill listening on http://localhost:${port}`));

function send(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
