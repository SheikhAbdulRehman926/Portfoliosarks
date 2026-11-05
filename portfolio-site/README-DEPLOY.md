# Deploy to Vercel

## 1. Deploy
- Push this folder to a GitHub repository, then import it at vercel.com/new
  (Framework Preset: Other, no build command, output directory ./).
- CLI alternative: `npm i -g vercel`, then `vercel --prod` inside this folder.

## 2. Turn on live recommendations (one-time, about 2 minutes)
Recommendations are saved by the serverless function in `api/recommendations.js`, which needs a small database.
1. In your Vercel project open **Storage** (or Marketplace) and add **Upstash for Redis** (free plan is enough). Connect it to this project.
   Vercel adds the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
2. Redeploy the project once (Deployments, then Redeploy).
3. Optional moderation: add an environment variable `ADMIN_KEY` (any long secret). To remove a recommendation:
   `curl -X DELETE "https://YOUR-SITE/api/recommendations?id=RECOMMENDATION_ID" -H "x-admin-key: YOUR_SECRET"`
   (the id appears in the response of `GET /api/recommendations`).
Until the database is connected, the form falls back to opening an email to you.
Notes: a recommendation is published immediately; reviewers' email addresses are stored privately and never shown; if the visitor unticks the permission box, the recommendation is saved privately and not displayed.

## 3. Settings you may edit
The `CFG` object near the bottom of `index.html`: email, phone, WhatsApp number, `bookingUrl` (Calendly or Google Calendar link).

## Notes
- The intro video starts by itself when scrolled into view, once per visit (a refresh does not replay it).
- Font (Manrope) is self-hosted in `assets/fonts`.
- Some original photos are low resolution (about 480 px wide). They are shown at their true size so they stay sharp; replacing them with larger originals would let them display bigger.
