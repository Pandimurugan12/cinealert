# CineAlert 🎬
> Ticket availability tracker for BookMyShow & District (by Zomato)

Get instant Telegram notifications the moment cinema tickets open for your movie, theater, and date.

---

## Features
- Track any movie on BookMyShow + District simultaneously
- Choose any city and theater
- Filter by showtime and seat category
- Telegram notifications within 5 minutes of tickets opening
- Pause/resume trackers anytime
- Clean dark UI — works on mobile too

---

## Free Hosting on Render.com (Recommended)

### Step 1: Push to GitHub
1. Create a new repo on GitHub (e.g. `cinealert`)
2. Upload all project files maintaining the folder structure:
   ```
   cinealert/
   ├── backend/
   │   ├── server.js
   │   └── package.json
   ├── frontend/
   │   ├── src/
   │   │   ├── App.js
   │   │   ├── App.css
   │   │   └── index.js
   │   ├── public/
   │   │   └── index.html
   │   └── package.json
   ├── package.json
   └── render.yaml
   ```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New → Web Service**
3. Connect your GitHub account and select the `cinealert` repo
4. Render will auto-detect the `render.yaml` config
5. Click **Deploy** — it takes about 3-5 minutes

### Step 3: Your app is live!
Render gives you a free URL like `https://cinealert.onrender.com`

> **Note:** Free Render apps sleep after 15 minutes of inactivity. First load may take ~30 seconds to wake up. The tracker cron job runs continuously while awake.

---

## Local Development

```bash
# Install all dependencies
npm run install-all

# Run backend (port 3001)
npm run dev-backend

# Run frontend (port 3000) in a new terminal
npm run dev-frontend
```

Open http://localhost:3000

---

## How to Use
1. Click **+ New tracker**
2. Enter the movie name, city, theater, date
3. Paste the District URL from district.in (optional but recommended)
4. Enter the BMS Event Code from the BookMyShow URL (optional)
5. Enter your Telegram Bot Token and Chat ID
6. Click **Send test message** to verify
7. Click **Start Tracking** — you'll get a Telegram alert when tickets open!

---

## Getting Telegram Credentials

**Bot Token:**
1. Open Telegram → search @BotFather
2. Send `/newbot` and follow instructions
3. Copy the token you receive

**Chat ID:**
1. Start a chat with your bot
2. Send any message to it
3. Open: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Find `"chat":{"id": XXXXXXXXX}` — that's your Chat ID

---

## Tech Stack
- **Backend:** Node.js, Express, node-cron, axios
- **Frontend:** React 18
- **Notifications:** Telegram Bot API
- **Hosting:** Render.com (free tier)
