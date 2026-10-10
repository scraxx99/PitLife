// GET /api/people -> { people: [{ id, name, handle }], source: "slack" | "fallback", warning? }
import fallback from "./lib/people.mjs";

const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, people: null };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function fetchSlackPeople(token) {
  const out = [];
  let cursor = "";
  do {
    const url = new URL("https://slack.com/api/users.list");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "slack_error");
    for (const m of data.members) {
      if (m.deleted || m.is_bot || m.id === "USLACKBOT") continue;
      const name = m.real_name || m.profile?.real_name || m.profile?.display_name || m.name;
      if (!name) continue;
      out.push({ id: m.id, name, handle: m.profile?.display_name || m.name || "" });
    }
    cursor = data.response_metadata?.next_cursor || "";
  } while (cursor);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export default async () => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (token) {
    if (cache.people && Date.now() - cache.at < CACHE_MS) {
      return json({ people: cache.people, source: "slack" });
    }
    try {
      const people = await fetchSlackPeople(token);
      cache = { at: Date.now(), people };
      return json({ people, source: "slack" });
    } catch (err) {
      return json({
        people: fallback,
        source: "fallback",
        warning: `Slack lookup failed (${err.message}). Using the backup list.`,
      });
    }
  }
  return json({
    people: fallback,
    source: "fallback",
    warning: "SLACK_BOT_TOKEN is not set. Using the backup list.",
  });
};

export const config = { path: "/api/people" };
