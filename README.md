# Kiki

A community-driven fork of [Wiki.js](https://js.wiki/) v3, focused on reaching beta quality through feature completion, bug fixes, and modernization.

Wiki.js v3 (upstream) has been in alpha for several years with many features stubbed out or incomplete. Kiki picks up where upstream left off, wiring up the missing pieces to create a usable, self-hostable wiki platform.

## What's Different from Upstream Wiki.js v3

### Features Completed
- **Page History** — View revision timeline, inspect any version, restore previous versions
- **Reset Password** — Full forgot-password flow with email template
- **3rd Party Authentication** — Fixed critical bugs preventing Google OAuth (and other Passport strategies) from working. Removed experimental flag from admin UI
- **Browse Pages** — Full-screen page browser with search/filter
- **Page Table of Contents** — Auto-generated from headings with smooth scroll
- **Print View** — Clean print stylesheet for page printing
- **My Pages** — View all pages authored by a user
- **Icon Picker** — Searchable MDI icon grid for page icons
- **Search Autocomplete** — Live search suggestions with keyboard navigation

### Editor Improvements
- **Insert Link** — Dialog with internal page search + external URL support
- **Insert Code Block** — Language selector with 50+ languages, line numbers toggle
- **Insert Diagram** — Mermaid (flowchart, sequence, gantt) and PlantUML templates
- **Insert Footnote** — Adds reference at cursor + definition at end of document
- **Insert Emoji** — Emoji shortcode insertion
- **Mermaid Rendering** — Client-side mermaid diagram rendering with latest mermaid 11.x

### Bug Fixes & Modernization
- Fixed deprecated `csurf` (replaced with `csrf-csrf`)
- Fixed deprecated `passport-azure-ad` dependency
- Added Content Security Policy (CSP) headers
- Fixed missing `pako` dependency
- Fixed `.mjs` vs `.js` import mismatch for auth strategy modules
- Fixed strategy `init()` parameter mismatch (was passing UUID instead of config)
- GraphQL schema types corrected from `Int` to `UUID` where appropriate

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
cd blocks && pnpm install && pnpm build && cd ..

node server
```

Open `http://localhost:3000` and login with `admin@example.com` / `12345678`.

### Frontend Development

Run the server and Quasar dev server simultaneously:

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

## Remaining Work

See the [upstream v3 feature tracker](https://github.com/requarks/wiki/issues/6844) for the full checklist. Key remaining items:

- [ ] Comments system
- [ ] External storage module wiring (admin)
- [ ] Analytics admin module
- [ ] Locale switching
- [ ] Convert page between editors
- [ ] WYSIWYG editor output rendering + polish
- [ ] Tabsets
- [ ] Draw.io integration

## License

AGPLv3 — same as upstream Wiki.js. See [LICENSE](LICENSE).

## Acknowledgments

Kiki is built on top of [Wiki.js](https://js.wiki/) by [Requarks](https://github.com/requarks). All credit for the core architecture goes to the upstream team.
