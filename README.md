# Extensions Hub Sites

This repo is the shared public website layer for multiple Chrome extensions.

Current apps:

- `deep-note`
- `sketch-party`

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
- `/sketch-party`
- `/sketch-party/login`
- `/sketch-party/pricing`
- `/sketch-party/payment`
- `/sketch-party/privacy`
- `/sketch-party/terms`
- `/sketch-party/support`
- `/sketch-party/leave`

## Where to add a new extension

Start here:

- [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)
- [docs/EXTENSION_PAGE_PLAYBOOK.md](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/docs/EXTENSION_PAGE_PLAYBOOK.md)

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

The key rule is: each route must stay product-scoped. A user opening `/sketch-party/leave` should never see Deep Note copy or behavior, and vice versa.

When an extension opens website routes directly, prefer a shared handoff query shape so the website can stay in sync with the extension account context:

- `source=chrome-extension`
- `appId=<extension-app-id>`
- `clientId=<extension-client-id>`
- `accountId=<signed-in-account-id>`
- `email=<signed-in-email>`

The detailed guide for what each page should contain lives here:

- [docs/EXTENSION_PAGE_PLAYBOOK.md](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/docs/EXTENSION_PAGE_PLAYBOOK.md)

## Admin analytics

The hub now includes:

- `/admin`

This page is meant to select an extension and load that extension's own analytics endpoint. The hub UI is shared, but analytics streams must remain separate per extension.

For a new extension:

- wire its own admin analytics endpoint in [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)
- always send and enforce the extension `app_id` in analytics events and admin analytics queries
- do not reuse another extension's analytics backend unless that is explicitly intended
- prefer an admin analytics contract like `GET /api/admin/analytics?appId=...` with item-level `appId` fields in the response

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
- [docs/EXTENSION_PAGE_PLAYBOOK.md](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/docs/EXTENSION_PAGE_PLAYBOOK.md)

This project is config-driven on purpose. Do not hardcode Deep Note assumptions into shared layout/components unless the route is explicitly scoped to `/deep-note`.
