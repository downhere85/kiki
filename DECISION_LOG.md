# Kiki v3 — Decision Log

Decisions made during the v3 beta development.

---

## 2026-03-27

### Resolved

- **Google OAuth production:** Copied client ID/secret from v2 database. Required `.cjs` file extension fix for CommonJS auth modules under ESM.
- **User migration:** Imported all 814 users as active accounts. OAuth users get placeholder passwords (they authenticate via Google).
- **Page migration:** 6,770 pages imported successfully. Render jobs queued for background processing.
- **Deployment:** DigitalOcean droplet at 165.245.184.121, port 80. Wiki.js v2 stopped, Kiki running.

### Open

- **SSL/HTTPS:** Needs domain name pointed to droplet, then Let's Encrypt setup.
- **Google OAuth redirect URI:** Needs updating in Google Cloud Console to include Kiki's callback URL.
- **Professional logo:** Current squirrel is a placeholder SVG. Commission a proper design.

## 2026-03-26

### Resolved

- **New Page From Template:** Dropped from scope. Not needed for beta.
- **AsciiDoc editor:** Dropped from scope. Not needed for beta.
- **SSR for SEO:** Deferred to post-beta. Kiki is primarily private/internal.
- **WYSIWYG editor:** Full treatment — rendering fixed + editor toolbar polished.
- **Search autocomplete:** Implemented using existing searchPages query with debounce.
- **Analytics:** Google Analytics (external) + built-in page view counter + star ratings + admin dashboard.
- **Individual tracking:** Aggregate only (no per-user tracking for privacy).
- **Theme:** Modern warm UI — rounded corners, system fonts, dark charcoal chrome.

## 2026-03-25

### Resolved

- **Auth priority:** Google OAuth first. Other providers later.
- **Editor priority:** Markdown editor first, then WYSIWYG.
- **Table editor:** Keep the visual Tabulator grid editor, fix the save handler.
- **External storage:** Git/GitHub only (bidirectional sync).
- **Analytics provider:** Google Analytics only.
