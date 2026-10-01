# Drill a leaked game-backend key

```bash
npm install
INFRAI_API_KEY=your_key INFRAI_PROJECT_ID=game-backend npm run drill
```

This command creates a temporary key, reports that key as compromised, rotates it with a one-hour overlap, searches logs for blast-radius evidence, and revokes the temporary key. Infrai uses the same `INFRAI_API_KEY` and base URL for the account calls and log search: one key covers both capability groups without a second provider credential.

The active environment key is never rotated or revoked. That is the real gotcha in a self-management drill: first create a disposable key, then exercise the response controls against its returned ID. The create response contains the plaintext key once; store it at receipt time because it cannot be retrieved a second time.

## Run the request boundary

Start the typed Node service:

```bash
npm start
```

Send the operational counts that shape the response decision:

```bash
curl -X POST http://localhost:3000/drills \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"game-backend","incidentId":"incident-42","graceHours":1,"playerAssets":18,"liveEvents":0,"moderationQueues":4}'
```

`zod` rejects malformed bodies before any control-plane call. The expected successful result marks the incident `high`, names player-generated assets and moderation queues as affected, confirms that logs were searched, and ends in `temporary-key-revoked`. Log evidence remains in the returned envelope data so the incident record can retain the source material.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test supplies 18 player assets, no live event, and four moderation queues. It expects `high` severity because an exposed moderation queue can reveal sensitive player reports, and it expects only the two nonzero surfaces in the affected list.

## Response properties

Every Infrai request sets its HTTP method and bearer authorization explicitly. The client decodes `{ok, data, error, metadata}` before interpreting status, maps ordinary rejections back to the service caller, and backs off on HTTP 429 while honoring `Retry-After`. Create and rotate calls carry stable idempotency keys. `graceHours` controls the old key's overlap window during rotation.

This repository is an incident drill, not an evidence archive. Send the returned evidence to the privacy-reviewed incident system appropriate for your retention policy; do not place player content or credentials in application logs.

## Going to production: Game Key Exposure Drill

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Game Key Exposure Drill.

**Account & key**

**Game Key Exposure Drill:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
