# PAKT Project Documentation
**Last Updated:** December 31, 2025
**Current Version:** 0.7.0
**Status:** Production - Live at getpakt.app

---

## ⚠️ CRITICAL RULES FOR CLAUDE

### Before Making ANY Changes:
1. **ALWAYS verify these exist in index.html before providing updated file:**
   - [ ] Google Analytics: `G-D98VXQ2XM2` (should appear 2x)
   - [ ] trackEvent function defined
   - [ ] trackEvent calls (should be 9+)
   - [ ] FOOD_DATABASE has `filters:` arrays (should be 7)
   - [ ] `activeFilters` state in FoodSelectorModal (should be 8+ occurrences)
   - [ ] Bracket counts balanced (open = close)

2. **Never work from memory** - always use the uploaded/fetched file as base

3. **After changes, run verification:**
```bash
echo "Analytics:" && grep -c "G-D98VXQ2XM2" index.html
echo "trackEvent:" && grep -c "trackEvent(" index.html
echo "Filters:" && grep -c "filters:" index.html
echo "activeFilters:" && grep -c "activeFilters" index.html
```

4. **Update version number** in index.html when making changes

5. **Update this PAKT-PROJECT.md** with changes made

---

## Quick Start for New Chat

Paste this to start a session:
```
Continue PAKT development. Here's the repo:
https://raw.githubusercontent.com/GiovanniOli001/pakt-app/main/public/index.html
```

Or upload the index.html file directly.

---

## What is PAKT?

A Progressive Web App (PWA) for Australian parents to:
- Plan school lunchboxes (309 food items from Coles/Woolies)
- Track kids' chores with points system
- Reward healthy eating and completed tasks
- Manage multiple children with dietary preferences

**Tagline:** "Lunch. Chores. Done."

**Target Audience:** Australian parents with school-age children (5-12)

---

## Repository Structure

```
pakt-app/
├── public/                    # Cloudflare Pages (auto-deploys)
│   ├── index.html            # Main React app (~8600 lines)
│   ├── success.html          # Post-payment license page
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (v6)
│   ├── favicon.ico           # Multi-size favicon
│   ├── favicon-32.png        # 32px favicon
│   ├── icon-192.png          # PWA icon
│   └── icon-512.png          # PWA icon large
├── worker/
│   └── pakt-worker.js        # Cloudflare Worker API (v3)
├── PAKT-PROJECT.md           # This file
└── README.md                 # Basic readme
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Single-file React app (Babel in-browser) |
| Styling | Tailwind CSS (CDN) |
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers |
| Database | Cloudflare KV |
| Payments | Stripe ($3.99 AUD one-time) |
| Analytics | Google Analytics (G-D98VXQ2XM2) |
| Domain | getpakt.app (Cloudflare) |
| Email | support@getpakt.app |

---

## URLs & Configuration

### Live URLs
- **App:** https://getpakt.app
- **Payment:** https://buy.stripe.com/14AaEY8AH0jQ4LycHn6EU00
- **API:** https://pakt-api.oliveri-john001.workers.dev
- **Success Page:** https://getpakt.app/success.html

### LICENSE_CONFIG (in index.html)
```javascript
const LICENSE_CONFIG = {
  apiUrl: 'https://pakt-api.oliveri-john001.workers.dev',
  productUrl: 'https://buy.stripe.com/14AaEY8AH0jQ4LycHn6EU00',
  price: '$3.99 AUD',
  trialDays: 7,
  debugCode: 'debugpakt'
};
```

---

## Google Analytics Events

| Event | When Fired | Parameters |
|-------|------------|------------|
| `child_created` | New child added | child_name |
| `child_updated` | Child profile edited | child_name |
| `lunchbox_planned` | Day saved with items | day, item_count, child_name |
| `chore_completed` | Chore marked done | chore_name, points, child_name |
| `reward_redeemed` | Reward claimed | reward_name, points_cost, child_name |
| `favorite_saved` | Lunch saved as favorite | favorite_name |
| `surprise_week_used` | 🎲 Surprise Week clicked | child_name (throttled 60s) |
| `surprise_day_used` | 🎲 Surprise! clicked | day, child_name (throttled 60s) |
| `shopping_item_checked` | Shopping item ticked | - |
| `todo_item_completed` | Todo task checked | - |

---

## Food Database

| Category | Filter Options | Item Count |
|----------|---------------|------------|
| Fruit | Fresh, Dried, Frozen, Cups & Pouches | ~50 |
| Vegetables | Fresh, Pre-Cut, Cooked, Dips | ~40 |
| Dairy | Cheese, Yoghurt, Milk, Other | ~35 |
| Protein | Deli Meats, Chicken, Eggs, Seafood, Vegetarian, Hot Foods | ~50 |
| Grains | Sandwiches, Wraps, Rice, Crackers, Chips, Pasta, Other | ~50 |
| Drinks | Water, Juice, Milk, Flavoured | ~25 |
| Sweets | Bars, Biscuits, Chips, Fruit Snacks, Chocolate | ~60 |
| **Total** | | **~309 items** |

---

## API Endpoints (pakt-worker.js v3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check, returns version |
| `/webhook` | POST | Receives Stripe payment events |
| `/activate` | POST | Activate license on device |
| `/validate` | GET | Simple key validation |
| `/check-device` | GET | Check if device already activated |
| `/lookup` | GET | Find license by email |
| `/success` | GET | Get license by Stripe session |
| `/deactivate` | POST | Remove device from license |

---

## Deployment

### GitHub → Cloudflare Pages (Automatic)
1. Push to `dev` branch → Preview deploy
2. Merge `dev` to `main` → Production deploy
3. Live in ~30 seconds

### Merge Process
1. GitHub → Pull requests → New pull request
2. base: `main` ← compare: `dev`
3. Create pull request → Merge → Confirm

### Worker Updates (Manual)
1. Cloudflare Dashboard → Workers → pakt-api
2. Edit Code → Paste new code → Deploy

---

## Service Worker Updates

When updating `sw.js`, **increment cache version**:
```javascript
const CACHE_NAME = 'pakt-v7'; // Was v6
```

---

## Testing Commands (Browser Console)

```javascript
// Fresh Trial (7 days)
localStorage.clear(); sessionStorage.clear(); 
localStorage.setItem('lunchbox-trial-start', Date.now().toString()); 
location.reload();

// Expired Trial
localStorage.clear(); sessionStorage.clear(); 
localStorage.setItem('lunchbox-trial-start', (Date.now() - 10*24*60*60*1000).toString()); 
location.reload();

// Nuclear Reset
localStorage.clear(); sessionStorage.clear(); location.reload();
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **0.7.0** | **Dec 31, 2025** | **Restored: Google Analytics, food filters, 309 food items, trackEvent calls** |
| 0.6.0 | Dec 28, 2025 | PAKT rebrand, Stripe payments, device limiting |
| 0.5.3 | Dec 28, 2025 | Food database expansion (241 items) |
| 0.5.2 | Dec 28, 2025 | Points system fix, chores enhancements |
| 0.5.1 | Dec 27, 2025 | Per-category food points, avatar fix |
| 0.5.0 | Dec 27, 2025 | Chores feature, kindness bonus |

---

## Recent Session (Dec 31, 2025)

**Problem:** index.html was missing Google Analytics, food filters, and ~60 food items

**Fixed:**
- ✅ Restored Google Analytics (G-D98VXQ2XM2)
- ✅ Restored trackEvent + trackEventThrottled functions
- ✅ Restored all 9 trackEvent calls throughout app
- ✅ Restored full FOOD_DATABASE (309 items with tags)
- ✅ Restored category filters (Fresh, Dried, Cheese, etc.)
- ✅ Restored filter UI in FoodSelectorModal
- ✅ Added checkDietaryConflict function

**Root cause:** Working from outdated file instead of fetching latest

---

## Future Ideas (Not Implemented)

- [ ] Family sync (share data between parents)
- [ ] Push notifications
- [ ] Dark mode
- [ ] Seasonal lunchbox themes
- [ ] Export/import data

---

## Contact

- **Support:** support@getpakt.app
- **Domain:** Cloudflare (getpakt.app)
- **Payments:** Stripe
