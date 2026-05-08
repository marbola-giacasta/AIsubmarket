# Deployment Guide — Vercel

## Overview
You deploy TWO separate Vercel projects from this single GitHub repo:
- **Frontend** → root directory: `frontend`
- **Backend**  → root directory: `backend`

---

## Step 1 — Push to GitHub
```bash
git add .
git commit -m "your message"
git push
```

---

## Step 2 — Deploy Backend on Vercel
1. vercel.com → Add New Project → import `subdomain-selling`
2. Set **Root Directory** → `backend`
3. Framework Preset → **Other**
4. Click Deploy

### Backend Environment Variables (Settings → Environment Variables)
```
JWT_SECRET                    your_secret_key
SUPABASE_URL                  https://xxx.supabase.co
SUPABASE_SERVICE_KEY          sb_secret_...
CLOUDFLARE_API_TOKEN          your_cf_token
CLOUDFLARE_ZONE_ID_OPENAICH   zone_id_here
CLOUDFLARE_ZONE_ID_OPENAILIVE zone_id_here
CLOUDFLARE_ZONE_ID_GEMINAI    zone_id_here
CLOUDFLARE_ZONE_ID_COURSEAI   zone_id_here
STRIPE_SECRET_KEY             sk_test_... (or sk_live_...)
SUBDOMAIN_PRICE_CENTS         999
FRONTEND_URL                  https://aisubmarket.vercel.app
```

After adding variables → **Redeploy**.

Note down your backend URL, e.g.: `https://subdomain-selling-backend.vercel.app`

---

## Step 3 — Deploy Frontend on Vercel
1. vercel.com → Add New Project → import `subdomain-selling`
2. Set **Root Directory** → `frontend`
3. Framework Preset → **Vite**
4. Click Deploy

### Frontend Environment Variables (Settings → Environment Variables)
```
VITE_API_URL    https://subdomain-selling-backend.vercel.app
```
(use your actual backend URL from Step 2)

After adding variables → **Redeploy**.

---

## Step 4 — Done
Visit https://aisubmarket.vercel.app — login should now work.

---

## Local development
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```
No environment variables needed in frontend locally — vite.config.js proxies /api to localhost:3001 automatically.
