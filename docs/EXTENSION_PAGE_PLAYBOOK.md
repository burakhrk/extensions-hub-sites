# Extension Page Playbook

Use this document when adding a new extension to the shared website hub.

The goal is not only to create routes, but to make sure every extension has a complete and clearly separated public surface.

## Core rule

Every extension must own its own public pages.

Even though the domain is shared, these pages should never feel shared:

- landing page
- install handoff
- login page
- pricing page
- payment page
- privacy policy
- terms of use
- support page
- uninstall feedback / "why are you leaving" page

The copy, query handling, backend calls, and legal scope must stay product-specific.

## Required pages

### 1. Landing page

Route example:

- `/{extension-slug}`

Purpose:

- explain what the extension does
- show who it is for
- link to install, pricing, and support

Recommended content:

- product badge or hero label
- one clear value proposition
- 3 to 5 feature callouts
- install CTA
- support CTA
- pricing CTA

Should not:

- mention other extensions unless the hub home page is the context
- reuse another product's copy

### 2. Install handoff

This can be part of the landing page or a dedicated install block.

Purpose:

- send users to the correct store listing
- explain first install expectations

Recommended content:

- store install button
- "what happens after install"
- browser compatibility note if relevant

### 3. Login page

Route example:

- `/{extension-slug}/login`

Purpose:

- explain why the extension asks for Google sign-in
- explain what is restored after login
- explain whether auth is account-based, app-scoped, or shared with other products

Recommended content:

- what sign-in unlocks
- what comes back after reinstall
- what data is account-linked
- link back to privacy page

If using extension-compatible OAuth:

- mention Chrome-extension-compatible login
- do not describe it like a normal web-only login flow

### 4. Pricing page

Route example:

- `/{extension-slug}/pricing`

Purpose:

- public plan comparison
- show what is free vs paid
- explain website-first billing if payment is not inside the extension

Recommended content:

- free plan summary
- paid plan summary
- trial details if any
- CTA to payment page or checkout handoff

### 5. Payment page

Route example:

- `/{extension-slug}/payment`

Purpose:

- checkout handoff
- account-linked billing explanation
- future billing portal or provider redirect

Recommended content:

- which account is buying
- where checkout continues
- what happens after successful payment
- how Pro is restored inside the extension

Should not:

- pretend checkout is inside the extension if it is actually website-first

### 6. Privacy policy

Route example:

- `/{extension-slug}/privacy`

Purpose:

- clearly describe data handling for that extension only

Minimum topics:

- what is stored locally
- what is sent to backend services
- what sign-in changes
- what analytics collect
- what is not collected

### 7. Terms of use

Route example:

- `/{extension-slug}/terms`

Purpose:

- define extension-specific usage expectations and limitations

Should cover:

- acceptable use
- content responsibility
- paid plan or experimental feature disclaimers

### 8. Support page

Route example:

- `/{extension-slug}/support`

Purpose:

- give users a clear help path for that extension only

Recommended content:

- install help
- login help
- billing help
- bug report path
- privacy/legal references

### 9. Uninstall feedback / leave page

Route example:

- `/{extension-slug}/leave`

Purpose:

- collect product-specific uninstall feedback
- explain that the feedback belongs only to that extension

Recommended content:

- short reason picker
- optional freeform note
- backend submit route if available

Important:

- every extension should own its own leave route
- do not reuse another extension's uninstall messaging

## Optional pages

### Share page

Route example:

- `/{extension-slug}/share/:slug`

Only add this if the product actually exposes public shared content.

### Admin analytics

Route example:

- `/admin`

This is a shared hub route, but the data must remain extension-scoped.

Rules:

- choose one extension at a time
- query only that extension's analytics endpoint
- always send and enforce `app_id`
- never render mixed event streams by default

## How to add a new extension correctly

### Step 1

Add the product to:

- [src/content/extensions.ts](/C:/Users/burak/Desktop/Burakhrk/SideProjects/extensions-hub-sites/src/content/extensions.ts)

At minimum define:

- `slug`
- `appId`
- `name`
- copy blocks
- required pages
- feature flags
- install URL if available
- admin analytics endpoint if available

### Step 2

Make sure the route model supports the pages that extension needs.

If the route is shared across all products:

- keep behavior config-driven

If the route is special:

- scope the component and behavior to that extension only

### Step 3

Check legal and product separation.

Ask:

- does this page mention only the correct extension?
- does this route call only the correct backend?
- does billing text match the real flow?
- does uninstall feedback go to the correct product endpoint?

## Backend expectations

The hub is only the public surface.

Each extension may still need its own backend support for:

- billing state
- payment handoff
- uninstall feedback submission
- shared note loading
- admin analytics

Do not assume one extension's backend can safely serve another without explicit design.

## Final acceptance checklist

Before saying a new extension is "ready" in the hub, make sure:

- landing page exists
- login page exists
- pricing page exists
- payment page exists
- privacy page exists
- terms page exists
- support page exists
- leave page exists
- copy is product-specific
- backend calls are product-specific
- analytics are filtered by `app_id`
- no route accidentally references another extension
