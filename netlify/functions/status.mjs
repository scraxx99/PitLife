// GET  /api/status  -> { status, updatedAt, pinRequired }
// POST /api/status  -> body { status: "green" | "yellow" | "red", pin? }
import { getStore } from "@netlify/blobs";

const VALID = ["green", "yellow", "red"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "pit-status", consistency: "strong" });
  const pinRequired = Boolean(process.env.PIT_PIN);

  if (req.method === "GET") {
    const cur = await store.get("current", { type: "json" });
    return json({
      status: cur?.status ?? null,
      updatedAt: cur?.updatedAt ?? null,
      pinRequired,
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    if (pinRequired && body.pin !== process.env.PIT_PIN) {
      return json({ error: "Wrong PIN" }, 401);
    }
    if (!VALID.includes(body.status)) {
      return json({ error: "Invalid status" }, 400);
    }
    const cur = { status: body.status, updatedAt: new Date().toISOString() };
    await store.setJSON("current", cur);
    return json({ ...cur, pinRequired });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/status" };
