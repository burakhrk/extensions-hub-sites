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
- login
- pricing
- payment
- privacy
- terms
- support
- leave

## Special pages

Special routes are opt-in:

- shared note pages like `/deep-note/share/:slug`
- extension analytics integration through `/admin`

If another extension needs custom pages later, add a route-scoped component and keep the logic tied to that product slug only.

## Extension launch checklist inside the hub

When a new extension is added, it should not stop at only a landing page. The expected public surface is:

- landing page
- login page
- pricing page
- payment page
- privacy page
- terms page
- support page
- uninstall feedback page

These should be declared in config so another agent can tell at a glance what the product still needs.

## Admin isolation rule

The hub can host a shared admin UI, but each extension must still own:

- its own analytics endpoint
- its own passcode / auth requirement
- its own event stream

The admin page should help select an extension, not merge products together.

## Product isolation rule

Keep product-specific copy and behavior inside config or product-scoped components.

Bad:

- hardcoding `Deep Note` in shared shell
- assuming every product has a share page

Good:

- reading `extension.name`
- checking `extension.features.sharePage`
