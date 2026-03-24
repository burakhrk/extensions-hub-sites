# Architecture

## Intent

This repo serves multiple extension websites from one domain while keeping each extension clearly separated.

The rule is:

- shared shell
- per-extension content config
- route-scoped special behavior

## Main files

- [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)
- [src/App.tsx](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/App.tsx)
- [src/site.css](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/site.css)

## Shared pages

Every extension can have:

- home
- pricing
- privacy
- terms
- support

## Special pages

Special routes are opt-in:

- Deep Note currently enables `share` and `leave`

If another extension needs custom pages later, add a route-scoped component and keep the logic tied to that product slug only.

## Product isolation rule

Keep product-specific copy and behavior inside config or product-scoped components.

Bad:

- hardcoding `Deep Note` in shared shell
- assuming every product has a share page

Good:

- reading `extension.name`
- checking `extension.features.sharePage`
