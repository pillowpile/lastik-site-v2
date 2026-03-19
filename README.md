# Lastik Site v2

## Local Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build/Deploy Model

- Static export: `next.config.ts` uses `output: "export"`.
- Netlify publishes the `out/` directory (see `netlify.toml`).
- `npm run build` prunes `out/materials` to only files referenced in generated pages.
- Canonical content source is repository code (`app/content/default-content.ts` + normalization in `app/content/storage.ts`).
- Browser `localStorage` drafts are disabled by default in both local and Netlify builds.

This is intentional so local preview and deployed site stay deterministic.

## Content Workflow (Stable)

1. Update project cards/content in repository files:
   - `app/content/default-content.ts`
   - `app/content/storage.ts` (normalization/fallback rules)
2. Validate locally:
   - `npm run build`
3. Push to `main`.
4. Netlify rebuilds from `main` and serves the same content as local build.

## Optional Draft Mode

If you intentionally want browser-local draft content, run with:

```bash
NEXT_PUBLIC_SITE_CONTENT_SOURCE=local-storage npm run dev
```

Do not use this mode for release verification, because data is not versioned in git.
