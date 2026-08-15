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
