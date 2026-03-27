# Kiki 🐿️

A community-driven fork of [Wiki.js](https://js.wiki/) v3, completing the feature checklist for beta readiness with a modern, warm UI.

Wiki.js v3 (upstream) has been in alpha for several years with many features stubbed out or incomplete. Kiki picks up where upstream left off — 30+ features implemented, zero `notImplemented` buttons remaining, production-deployed with 6,770+ pages.

## What's Different from Upstream Wiki.js v3

### Features Completed
- **Page History** — View revision timeline, inspect any version, restore previous versions
- **Browse Pages** — Full-screen page browser with search/filter
- **Bookmarks** — Bookmark pages from the header, browse from sidebar overlay
- **Watch Page** — Toggle page watching with visual indicator
- **Comments** — Page comments system with create/delete
- **Search Autocomplete** — Live search suggestions with keyboard navigation and debounce
- **Page Table of Contents** — Auto-generated from headings with smooth scroll-to-section
- **Print View** — Clean print stylesheet
- **My Pages** — View all pages authored by the current user
- **Icon Picker** — Searchable MDI icon grid for page icons
- **Draw.io** — Visual diagram editor integration
- **Reset Password** — Full forgot-password flow with email template
- **3rd Party Auth** — Fixed Google OAuth (and all Passport strategies). CommonJS/ESM compatibility resolved
- **Analytics** — Built-in page view tracking, star ratings, admin dashboard with Most Viewed / Top Rated / Low Rated tabs. Google Analytics integration
- **Utilities Admin** — Auth certificate invalidation, cache purging, search re-indexing

### Editor Improvements
- Insert Link (internal page search + external URL)
- Insert Code Block (50+ languages, line numbers toggle)
- Insert Diagram (Mermaid flowchart/sequence/gantt, PlantUML)
- Insert Footnote, Emoji, Tabset, Block
- Insert Asset from Remote URL
- Visual Table Editor with markdown output
- Convert Page between Markdown and WYSIWYG
- Collapsible + scrollable Mermaid diagram containers
- WYSIWYG (Tiptap) editor with text color, highlight, underline, table support

### Design & UX
- Modern warm theme — rounded corners, drop shadows, hover effects
- Dark charcoal sidebar/header, warm cream background
- System sans-serif fonts (SF Pro / Segoe UI)
- Mobile responsive (768px + 480px breakpoints)
- Escape key closes all overlays
- TOC clicks scroll to headings
- Tags empty state guidance
- New Page dropdown no longer truncated

### Bug Fixes & Modernization
- Fixed deprecated `csurf` (replaced with `csrf-csrf`)
- Fixed deprecated `passport-azure-ad` dependency
- Added Content Security Policy (CSP) headers
- Fixed `.mjs` vs `.js`/`.cjs` import for auth strategy modules
- Fixed strategy `init()` parameter mismatch (local vs 3rd party signatures)
- GraphQL schema types corrected from `Int` to `UUID`
- Large page tsvector crash fix (truncate search content)
- All `notImplemented` dead code removed

### Rebranding
- Full Wiki.js to Kiki rebrand across 23+ files
- Kiki squirrel mascot logo (monochrome SVG, theme-adaptive)
- NOTICE file for AGPLv3 license compliance
- Footer credits "Powered by Kiki, based on Wiki.js"

## Getting Started

### Docker (Recommended)

```bash
git clone https://github.com/downhere85/kiki.git
cd kiki/kiki/.devcontainer
docker compose up
```

Then open `http://localhost:3000` and login:
- **Email:** `admin@example.com`
- **Password:** `12345678`

### Production Deployment

```bash
# Build the frontend
cd ux && NODE_OPTIONS='--max-old-space-size=4096' npx vite build && cd ..

# Build Docker image
docker build -t kiki:latest -f dev/build/Dockerfile .

# Run with docker-compose
docker-compose up -d
```

### Manual Setup

**Requirements:**
- PostgreSQL 16+
- Node.js 24+
- [pnpm](https://pnpm.io/installation#using-corepack)

```bash
git clone https://github.com/downhere85/kiki.git
cd kiki/kiki
cp config.sample.yml config.yml
# Edit config.yml with your PostgreSQL details

cd server && pnpm install && cd ..
cd ux && pnpm install && pnpm build && cd ..

node server
```

### Frontend Development

```bash
# Terminal 1 - Server
cd server && pnpm dev

# Terminal 2 - Frontend (hot-reload on port 3001)
cd ux && pnpm dev
```

### pgAdmin

Available at `http://localhost:8000` (Docker setup only).
- Login: `dev@js.wiki` / `123123`
- DB host: `db`, port `5432`, user `postgres`, password `postgres`

## Deferred to Post-Beta

- SSR for SEO (Kiki is primarily used as a private wiki)
- New Page From Template
- AsciiDoc editor
- Professional logo design (placeholder squirrel in use)

## License

AGPLv3 — same as upstream Wiki.js. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Acknowledgments

Kiki is built on top of [Wiki.js](https://js.wiki/) by [Requarks](https://github.com/requarks). All credit for the core architecture goes to the upstream team.
