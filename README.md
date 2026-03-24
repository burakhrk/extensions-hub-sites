# Extensions Hub Sites

This repo is the shared public website layer for multiple Chrome extensions.

Current apps:

- `deep-note`
- `drawing-office`

The goal is to keep product websites separate from extension repos while still serving all products from one domain.

## Route model

- `/`
- `/admin`
- `/deep-note`
- `/deep-note/login`
- `/deep-note/pricing`
- `/deep-note/payment`
- `/deep-note/privacy`
- `/deep-note/terms`
- `/deep-note/support`
- `/deep-note/share/:slug`
- `/deep-note/leave`
- `/drawing-office`
- `/drawing-office/login`
- `/drawing-office/pricing`
- `/drawing-office/payment`
- `/drawing-office/privacy`
- `/drawing-office/terms`
- `/drawing-office/support`
- `/drawing-office/leave`

## Where to add a new extension

Start here:

- [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)

That file is the main config surface.

## Required per-extension public pages

Every extension added to this hub should define its own:

- landing page
- login page
- pricing page
- payment page
- privacy policy
- terms of use
- support page
- uninstall feedback / "why are you leaving" page

Share pages are optional and should be enabled only when the extension actually exposes public shared content.

The key rule is: each route must stay product-scoped. A user opening `/drawing-office/leave` should never see Deep Note copy or behavior, and vice versa.

## Admin analytics

The hub now includes:

- `/admin`

This page is meant to select an extension and load that extension's own analytics endpoint. The hub UI is shared, but analytics streams must remain separate per extension.

For a new extension:

- wire its own admin analytics endpoint in [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)
- always send and enforce the extension `app_id` in analytics events and admin analytics queries
- do not reuse another extension's analytics backend unless that is explicitly intended

## Local development

```powershell
npm install
npm run dev
```

## Deploy

Vercel settings:

- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## Notes for other AI agents

Read these files first:

- [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)
- [src/App.tsx](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/App.tsx)
- [docs/ARCHITECTURE.md](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/docs/ARCHITECTURE.md)

This project is config-driven on purpose. Do not hardcode Deep Note assumptions into shared layout/components unless the route is explicitly scoped to `/deep-note`.
