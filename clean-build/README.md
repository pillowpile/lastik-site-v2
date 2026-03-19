# Lastik Site v2 (Clean Build)

This folder is the new clean baseline and should be used as the primary version for further development.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

Note: build may require outbound access for Google Fonts used in `app/layout.tsx`.

## Key Architecture

- `app/content/storage.ts`: single normalization + localStorage persistence layer.
- `app/content/use-site-content.ts`: client subscription hook for live admin/frontend sync.
- `app/page.tsx`: ordered homepage grid with deterministic card rendering.
- `app/projects/[projectKey]/page.tsx`: server fallback from normalized default content.
- `app/projects/[projectKey]/project-page-client.tsx`: live project content sync from editor updates.
- `app/editor/page.tsx`: admin panel behavior preserved.

## Data Flow

1. Editor updates content and calls `saveSiteContent(...)`.
2. Storage writes normalized payload to `localStorage` and emits `SITE_CONTENT_EVENT`.
3. Homepage and project pages subscribe and re-read `loadSiteContent()`.
4. Frontend re-renders with updated cards/pages from the same normalized model.
