# Extensions Hub Sites

This repo is the shared public website layer for multiple Chrome extensions.

Current apps:

- `deep-note`
- `drawing-office`

The goal is to keep product websites separate from extension repos while still serving all products from one domain.

## Route model

- `/`
- `/deep-note`
- `/deep-note/pricing`
- `/deep-note/privacy`
- `/deep-note/terms`
- `/deep-note/support`
- `/deep-note/share/:slug`
- `/deep-note/leave`
- `/drawing-office`
- `/drawing-office/pricing`
- `/drawing-office/privacy`
- `/drawing-office/terms`
- `/drawing-office/support`

## Where to add a new extension

Start here:

- [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)

That file is the main config surface.

## Deep Note special pages

Deep Note uses:

- `/deep-note/share/:slug`
- `/deep-note/leave`

Other extensions do not need these routes unless explicitly added.

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
