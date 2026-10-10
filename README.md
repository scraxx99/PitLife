# Pit Status

A two-tab web app for your robotics pit, built for Netlify.

- **STATUS tab**: the whole page turns green, yellow or red. Put it on a laptop or TV at the pit or in the stands.
- **PIT CONTROL tab**: three big buttons to set the status, plus a search-and-tap list to call someone to the pit. Sending posts an @mention in Slack.

| Color | Meaning |
|---|---|
| Green | Robot is ready for match |
| Yellow | Robot is being prepped |
| Red | Something is wrong and has to be fixed |

The status is stored on the server (Netlify Blobs), so every device that has the page open updates within about 3 seconds.

Direct links: `/#display` opens the color screen, `/#pit` opens the form.

## Project layout

```
public/index.html              the whole front end
netlify/functions/status.mjs   get/set the pit status
netlify/functions/people.mjs   list of people (pulled from Slack)
netlify/functions/notify.mjs   sends the Slack @mention
netlify/functions/lib/people.mjs  optional backup list of people
netlify.toml
package.json
```

## 1. Create the Slack app (5 minutes)

1. Go to https://api.slack.com/apps and click **Create New App > From scratch**. Pick your team's workspace.
2. Open **OAuth & Permissions** and add these **Bot Token Scopes**:
   - `chat:write`
   - `users:read`
3. Click **Install to Workspace**, then copy the **Bot User OAuth Token** (starts with `xoxb-`).
4. Pick the channel the pit calls should go to. In Slack, open the channel and run `/invite @YourAppName`.
5. Get the channel ID: right-click the channel > **View channel details**. The ID is at the bottom (starts with `C`).

## 2. Deploy to Netlify

Use Git or the Netlify CLI, because this project has serverless functions. (Dragging a folder onto the Netlify web page does not reliably deploy functions.)

**Git:** push this folder to a GitHub repo, then in Netlify choose **Add new site > Import an existing project**. No build command is needed. Publish directory is `public` (already set in `netlify.toml`).

**CLI:**
```
npm install
npx netlify deploy --prod
```

## 3. Set environment variables

In Netlify: **Site configuration > Environment variables**.

| Variable | Required | What it is |
|---|---|---|
| `SLACK_BOT_TOKEN` | yes | The `xoxb-...` token from step 1 |
| `SLACK_CHANNEL_ID` | yes | The channel ID from step 1 |
| `PIT_PIN` | optional | If set, the pit tab asks for this PIN once per device before it can change status or send Slack messages |

Redeploy after adding variables.

## Notes

- The Slack message looks like: `@Jordan 🚨 We need you in the pit!` with your optional note on the end.
- The people list comes from your Slack workspace (bots and deactivated accounts are skipped) and is cached for 5 minutes. If Slack lookup fails, the app uses `netlify/functions/lib/people.mjs` instead.
- Anyone who has the site URL can view the status. Set `PIT_PIN` if you don't want strangers sending Slack messages.
- To test locally: `npm install`, then `npx netlify dev` (put the variables in a `.env` file first).
