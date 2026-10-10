// POST /api/notify -> body { userId, note?, pin? }
// Posts "@person we need you in the pit" to the configured Slack channel.
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const HINTS = {
  not_in_channel: "The bot isn't in that channel. In Slack, run /invite @YourBotName in the channel.",
  channel_not_found: "Slack couldn't find that channel ID. Check SLACK_CHANNEL_ID.",
  invalid_auth: "Slack rejected the bot token. Check SLACK_BOT_TOKEN.",
  token_revoked: "The Slack bot token was revoked. Make a new one.",
  missing_scope: "The Slack app needs the chat:write scope.",
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) {
    return json({ error: "Slack isn't set up yet (missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID)." }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  if (process.env.PIT_PIN && body.pin !== process.env.PIT_PIN) {
    return json({ error: "Wrong PIN" }, 401);
  }

  const userId = String(body.userId || "");
  if (!/^[UW][A-Z0-9]{2,}$/.test(userId)) {
    return json({ error: "Pick a person first." }, 400);
  }

  const note = String(body.note || "").replace(/[<>&]/g, "").trim().slice(0, 200);
  const text = `<@${userId}> 🚨 We need you in the pit!${note ? ` ${note}` : ""}`;

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text, link_names: true }),
  });
  const data = await res.json();

  if (!data.ok) {
    return json({ error: HINTS[data.error] || `Slack error: ${data.error}` }, 502);
  }
  return json({ ok: true });
};

export const config = { path: "/api/notify" };
