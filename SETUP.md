# CyberGuard — Setup Guide

## ⚠️ FIRST: Rotate your Resend API key
You shared your Resend key publicly. Do this now:
1. Go to https://resend.com/api-keys
2. Delete the exposed key
3. Create a new key
4. Open `.env.local` and replace `re_REPLACE_WITH_NEW_KEY_FROM_RESEND` with the new key

---

## Step 1 — Apply the database schema

1. Go to https://supabase.com/dashboard/project/mejofyycvbsmcwyvtikn/sql/new
2. Copy the entire contents of `supabase/schema.sql`
3. Paste it into the SQL editor
4. Click "Run"
5. You should see "Success. No rows returned"

---

## Step 2 — Enable Google OAuth (optional)

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Follow the guide to create a Google OAuth app
3. Paste Client ID and Secret into Supabase

---

## Step 3 — Configure email templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Update "Confirm signup" subject to: "Confirm your CyberGuard account"
3. Update "Reset password" subject to: "Reset your CyberGuard password"

---

## Step 4 — Run locally

```bash
# Terminal 1 — API server (handles real DNS/SSL scans)
npm run server

# Terminal 2 — Frontend (React app)
npm run dev
```

Open http://localhost:5173

---

## Step 5 — Push to GitHub

```bash
git init
git remote add origin https://github.com/JyotiSharma111/cyberguard.git
git add .
git commit -m "Initial commit — CyberGuard v1 with Supabase auth"
git push -u origin main
```

---

## Step 6 — Deploy frontend to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo `JyotiSharma111/cyberguard`
3. Add environment variables (Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://mejofyycvbsmcwyvtikn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click Deploy
5. Your app will be live at a `.vercel.app` URL

---

## Step 7 — Deploy API to Railway

1. Go to https://railway.app/new
2. Deploy from GitHub → select `JyotiSharma111/cyberguard`
3. Add environment variables:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `RESEND_API_KEY` (your NEW key)
   - `PORT` = `3001`
   - `FRONTEND_URL` = your Vercel URL
4. Set start command: `npm run server`
5. Railway gives you a public URL — add it to Vercel as `VITE_API_URL`

---

## How the auth flow works

1. User signs up → Supabase sends confirmation email
2. User clicks email link → redirected to your app, session created
3. App loads → checks Supabase for existing session
4. If no verified domains → Onboarding page
5. User adds domain → gets a TXT record to add to their DNS
6. User clicks "Check now" → API server checks DNS for the token
7. Verified → first scan runs → results saved to Supabase
8. Dashboard shows real data from DB

## Security summary

- Passwords: hashed by Supabase (bcrypt) — you never see them
- Sessions: JWT tokens managed by Supabase — auto-refresh
- Database: Row-level security means users can ONLY read their own data
- Staff emails: stored in DB, never exposed via share links
- API keys: in .env.local only — never in frontend code or GitHub
