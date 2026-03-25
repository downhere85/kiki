# Kiki v3 — Decision Log

Questions and decisions that need Kenneth's input. Review during daily standup.

---

## 2026-03-25

### Resolved

- **Auth priority:** Google OAuth first. Other providers later.
- **Editor priority:** Markdown editor first, WYSIWYG deferred to post-beta.
- **Table editor:** Keep the visual Tabulator grid editor, fix the save handler.
- **Reason For Change:** Set to `off` in dev DB. Need to fix the save flow for when it's enabled.

### Open

- **SSR for SEO:** Architectural decision needed. Defer to post-beta?
- **Search autocomplete:** Privacy concern noted by upstream. How to handle?
- **New Page From Template:** No template system exists in the backend (no schema, model, or storage). Needs full design: template CRUD, storage, and UI for picking templates during page creation. Should we design this or defer?
- **AsciiDoc editor:** The rendering module exists but needs the editor integration. Low priority if markdown is the main editor.
