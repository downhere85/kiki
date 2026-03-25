# Kiki v3 — Decision Log

Questions and decisions that need Kenneth's input. Review during daily standup.

---

## 2026-03-26

### Resolved

- **New Page From Template:** Dropped from scope. Not needed for beta.
- **AsciiDoc editor:** Dropped from scope. Not needed for beta.
- **SSR for SEO:** Deferred to post-beta. Kiki is primarily private/internal.
- **WYSIWYG editor:** Full treatment — fix rendering AND polish editor UX.
- **Search autocomplete:** Implemented using existing searchPages query with debounce.

## 2026-03-25

### Resolved

- **Auth priority:** Google OAuth first. Other providers later.
- **Editor priority:** Markdown editor first, then WYSIWYG.
- **Table editor:** Keep the visual Tabulator grid editor, fix the save handler.
- **Reason For Change:** Set to `off` in dev DB. Need to fix the save flow for when it's enabled.
