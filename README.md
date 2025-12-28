# PAKT - Lunch. Chores. Done.

A Progressive Web App for Australian parents to plan school lunchboxes and track kids' chores.

**Live at:** https://getpakt.app

## Project Structure

```
pakt-app/
├── public/              # Deployed to Cloudflare Pages
│   ├── index.html       # Main app (React single-file)
│   ├── success.html     # Post-payment page
│   ├── manifest.json    # PWA manifest
│   ├── sw.js            # Service worker
│   ├── favicon.ico      # Favicon
│   └── icon-*.png       # PWA icons
├── worker/              # Deployed to Cloudflare Workers
│   └── pakt-worker.js   # License API
├── PAKT-PROJECT.md      # Full project documentation
└── README.md            # This file
```

## Deployment

### Cloudflare Pages (App)
- Connect this repo to Cloudflare Pages
- Build command: (leave empty)
- Output directory: `public`
- Auto-deploys on push to main

### Cloudflare Workers (API)
- Copy `worker/pakt-worker.js` to Cloudflare Workers dashboard
- Or use Wrangler CLI

## Development

This is a single-file React app using:
- React 18 (via CDN)
- Tailwind CSS (via CDN)
- Babel (in-browser transpilation)

No build step required - edit and deploy.

## Quick Reference

- **App URL:** https://getpakt.app
- **API URL:** https://pakt-api.oliveri-john001.workers.dev
- **Payment:** Stripe ($3.99 AUD one-time)

See `PAKT-PROJECT.md` for full documentation.
