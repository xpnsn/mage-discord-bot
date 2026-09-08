# Mage Discord Bot — Deploy to Render (24/7)

## What was fixed
The original zip had no `package.json` (it was in `.gitignore` and never committed) and
mixed ES Module (`import`/`export`) and CommonJS (`require`/`module.exports`) syntax
across files, which crashes on plain Node. Everything here has been converted to
consistent CommonJS, a `package.json` was added, and a named-export bug in
`funtionality/QnA/ques.js` (mismatched with how it was imported) was fixed.

## 1. Push this folder to GitHub
Create a new GitHub repo and push this folder's contents to it (Render deploys from git).

## 2. Get your Discord bot credentials
In the [Discord Developer Portal](https://discord.com/developers/applications):
- **TOKEN**: your application → Bot → Reset Token (copy it)
- **CLIENT_ID**: your application → General Information → Application ID
- Under Bot, make sure **Message Content Intent** and **Server Members Intent** are enabled
  (this bot's intents require them).

## 3. Create the service on Render
Discord bots don't serve HTTP requests, so use a **Background Worker**, not a Web Service:

1. Render dashboard → **New** → **Background Worker**
2. Connect your GitHub repo
3. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment**, add:
   - `TOKEN` = your bot token
   - `CLIENT_ID` = your application/client ID
5. Deploy.

A Background Worker has no public URL and doesn't sleep like a free Web Service does —
it just keeps running, which is what you want for a bot that needs to stay connected 24/7.
Render's free-tier Background Workers do have limited monthly hours; check your plan if the
bot needs to run truly nonstop indefinitely.

## 4. Register the slash commands
The bot's slash commands (`/ping`, `/reaction-role`, `/rules-embed`, `/quiz-question`) need
to be registered with Discord once (and again whenever you add/change a command). Run this
**locally** (not on Render) with a `.env` file containing your `TOKEN` and `CLIENT_ID`:

```
npm install
npm run deploy-commands
```

You only need to redo this when commands change — it's not part of the bot's ongoing runtime.

## 5. Confirm it's running
Check the Render logs for the worker — you should see `The bot is online!`. Your bot should
then show as online in Discord.

---

## New: in-Discord admin features

On top of the deploy fixes above, the bot's code was reorganized (event
handlers moved out of `index.js` into `src/events/`, shared helpers added
under `src/utils/`) and these features were added. None of the original
commands or embeds changed — everything below is additive and configured
per-server from Discord itself.

### `/config` — assign channels & roles without touching code
- `/config set-channel type:<Welcome|Leave|Boost|Announcement> channel:#channel`
- `/config set-role type:<Welcome|Boost> role:@role`
- `/config view` — see current settings

Until you set these, the bot keeps using the same hardcoded/`.env` values
it always did — nothing changes for existing servers automatically.

### `/embed` — manage embeds without editing code
- `/embed create name:<name> title:… description:… color:#5865F2 image:… thumbnail:… footer:…`
- `/embed edit name:<name> …` — update any field
- `/embed delete name:<name>`
- `/embed list`
- `/embed preview name:<name>` — see it privately
- `/embed send name:<name> channel:#channel` — post it anywhere
- `/embed bind event:<Welcome|Leave|Boost> name:<name>` — use this embed
  instead of the built-in default when that event fires
- `/embed unbind event:<Welcome|Leave|Boost>` — go back to the default

Titles, descriptions, and footers support placeholders: `{user}`
(mention), `{username}`, `{server}`, `{memberCount}`.

### `/announce` — post an announcement
`/announce message:"…" title:… channel:#channel ping-role:@role color:#5865F2 image:…`
Defaults to the channel set with `/config set-channel type:Announcement`
if you don't pass one.

### `/role` — give or take a role
- `/role add user:@member role:@role`
- `/role remove user:@member role:@role`

Checks role hierarchy (yours and the bot's) before making changes.

### Ideas for later
- Swap the JSON files in `data/` for a real database (SQLite/Postgres) if
  this ever runs across many servers at once.
- Add `/embed bind` support for the rules embed too (it's currently a
  fixed multi-embed array in `src/embeds/rules.js`).
- Command cooldowns and a moderation/audit log channel.
- Finish out `/reaction-role`, which is currently a stub.
