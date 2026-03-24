export type ExtensionSlug = 'deep-note' | 'drawing-office'

export type ExtensionRequiredPage = {
  key: 'landing' | 'login' | 'pricing' | 'payment' | 'privacy' | 'terms' | 'support' | 'leave'
  label: string
  path: string
  required: boolean
  note: string
}

export type ExtensionDefinition = {
  slug: ExtensionSlug
  appId: string
  name: string
  category: string
  tagline: string
  summary: string
  iconPath: string
  heroBadge: string
  heroTitle: string
  heroBody: string
  callouts: string[]
  steps: string[]
  pricingTitle: string
  pricingBody: string
  proFeatures: string[]
  supportBody: string
  privacySummary: string[]
  termsSummary: string[]
  loginBody: string[]
  paymentBody: string[]
  requiredPages: ExtensionRequiredPage[]
  features: {
    sharePage?: boolean
    leavePage?: boolean
    websiteBilling?: boolean
    loginPage?: boolean
    paymentPage?: boolean
    adminAnalytics?: boolean
  }
  apiBase?: string
  adminApiBase?: string
  adminAnalyticsPath?: string
  installUrl?: string
}

const deepNoteApi = import.meta.env.VITE_DEEP_NOTE_API_URL || 'https://notetaker-backend.notetaker-app-burak.workers.dev'

const buildRequiredPages = (slug: ExtensionSlug): ExtensionRequiredPage[] => [
  { key: 'landing', label: 'Landing page', path: `/${slug}`, required: true, note: 'Product-specific overview page with clear install and support handoff.' },
  { key: 'login', label: 'Login page', path: `/${slug}/login`, required: true, note: 'Explain Google sign-in, account restore, and app-scoped identity.' },
  { key: 'pricing', label: 'Pricing page', path: `/${slug}/pricing`, required: true, note: 'Public pricing copy and plan comparison for this extension only.' },
  { key: 'payment', label: 'Payment page', path: `/${slug}/payment`, required: true, note: 'Website checkout / billing handoff page kept outside the extension.' },
  { key: 'privacy', label: 'Privacy policy', path: `/${slug}/privacy`, required: true, note: 'Public privacy page scoped to this extension and its data flows.' },
  { key: 'terms', label: 'Terms of use', path: `/${slug}/terms`, required: true, note: 'Public terms page specific to this extension and its obligations.' },
  { key: 'support', label: 'Support page', path: `/${slug}/support`, required: true, note: 'Public support route for install, billing, and product-specific issues.' },
  { key: 'leave', label: 'Why are you leaving page', path: `/${slug}/leave`, required: true, note: 'Uninstall feedback page opened by the extension removal flow for that product.' },
]

export const extensions: ExtensionDefinition[] = [
  {
    slug: 'deep-note',
    appId: 'deep-note',
    name: 'Deep Note',
    category: 'Chrome extension',
    tagline: 'Save highlights fast. Review them later.',
    summary: 'Capture text or images while browsing, organize them into folders, and get quick AI help over your saved notes.',
    iconPath: '/products/deep-note/icon.svg',
    heroBadge: 'Quick notes. Quick summaries.',
    heroTitle: 'A separate public home for the Deep Note extension.',
    heroBody:
      'Deep Note is designed for fast capture while browsing. Save useful lines, sort them later, and ask AI to help you revisit what mattered.',
    callouts: [
      'Save highlights from any webpage without breaking your flow.',
      'Organize notes into folders, tags, and kanban-friendly views.',
      'Use AI summaries, smart suggestions, and knowledge chat across saved notes.',
    ],
    steps: [
      'Highlight text or capture an image on a page.',
      'Save it to Deep Note with AI suggestions or a chosen folder.',
      'Open the dashboard later to review, search, and ask across your notes.',
    ],
    pricingTitle: 'Website billing for Deep Note Pro',
    pricingBody:
      'Deep Note keeps billing outside the extension. Google sign-in links the account, starts the time-limited trial, and keeps Pro tied to the same user.',
    proFeatures: [
      'AI summaries, smart tags, and folder suggestions.',
      'Knowledge chat across your saved notes.',
      'Premium workflows like reminders and future account-based features.',
    ],
    supportBody:
      'Use this page for public support, legal pages, pricing handoff, and shared note links for Deep Note.',
    privacySummary: [
      'Deep Note stores notes locally by default and only sends note content to backend services when the user triggers AI, sharing, or cloud-linked features.',
      'Google sign-in can be used for cloud restore and account-linked billing state.',
    ],
    termsSummary: [
      'Deep Note is provided as-is during active iteration.',
      'Users are responsible for the material they save, organize, and share.',
    ],
    loginBody: [
      'Deep Note login should always explain that Google sign-in restores cloud-linked note state, billing state, and account-linked features.',
      'The login page should make it obvious that auth belongs to Deep Note only and does not sign the user into unrelated extensions on the same domain.',
    ],
    paymentBody: [
      'Deep Note payment should stay on the website, not inside the extension.',
      'The payment route should be the handoff page for checkout, account-linked upgrades, and future billing portal access.',
    ],
    requiredPages: buildRequiredPages('deep-note'),
    features: {
      sharePage: true,
      leavePage: true,
      websiteBilling: true,
      loginPage: true,
      paymentPage: true,
      adminAnalytics: true,
    },
    apiBase: deepNoteApi,
    adminApiBase: deepNoteApi,
    adminAnalyticsPath: '/api/admin/analytics',
  },
  {
    slug: 'drawing-office',
    appId: 'drawing-office',
    name: 'Drawing Office',
    category: 'Chrome extension',
    tagline: 'Live drawing, surprise effects, and lightweight social play between friends.',
    summary: 'Drawing Office lets signed-in users sync once, see friends again later, and send visual moments with live drawing, effect drops, and playful sessions.',
    iconPath: '/products/drawing-office/icon.svg',
    heroBadge: 'Live social drawing.',
    heroTitle: 'A playful extension for sending drawings, effects, and little visual surprises.',
    heroBody:
      'Drawing Office is an account-based Chrome extension where friends can reconnect, send quick effect drops, sketch together in live mode, and keep their preferences tied to the same identity.',
    callouts: [
      'Google sign-in restores your profile, friend graph, and app-specific preferences.',
      'Quick-send effects make playful surprise moments possible without forcing a full session every time.',
      'Live mode turns the canvas into a shared back-and-forth space for social drawing.',
    ],
    steps: [
      'Sign in with Google and let Drawing Office restore your app-scoped social state.',
      'Add a friend once, then pick them from your list whenever you want to draw or send an effect.',
      'Choose between send mode, live mode, or a quick popup shortcut for faster interaction.',
    ],
    pricingTitle: 'Drawing Office plans and future upgrades',
    pricingBody:
      'Drawing Office is structured so future premium plans, account-linked upgrades, and website billing can live outside the extension without breaking the in-extension flow.',
    proFeatures: [
      'Expanded effect packs and richer sendable animations.',
      'Future account-linked perks that stay scoped to drawing-office only.',
      'Website-driven upgrades that keep Chrome Web Store messaging cleaner.',
    ],
    supportBody:
      'Use this route for Drawing Office installation help, login guidance, privacy explanations, and product-specific support.',
    privacySummary: [
      'Drawing Office uses account-based identity so the same user can restore profile and app preferences after reinstalling the extension.',
      'Analytics should stay interaction-only and must not include message content, drawing payloads, or private freeform content.',
      'Product data is scoped to the drawing-office app_id even though the underlying Supabase project is shared across products.',
    ],
    termsSummary: [
      'Drawing Office is meant for playful, consensual interactions between connected users and should not be used to harass or mislead people.',
      'The product may evolve quickly while account, legal, and privacy boundaries stay specific to drawing-office.',
      'Shared infrastructure does not merge this extension’s product obligations with other extensions on the same domain.',
    ],
    loginBody: [
      'Drawing Office login should explain that Google sign-in restores the same profile, friend graph, and per-app preferences after reinstall.',
      'If the extension uses Supabase Auth, the login page should mention Chrome-extension-compatible OAuth and the fact that account identity is scoped through app_id aware data access.',
    ],
    paymentBody: [
      'Drawing Office payment should live on the website so the extension can keep Chrome Web Store messaging cleaner.',
      'Future checkout, billing portal, and account-linked upgrades should be routed through this page rather than embedded directly in the extension.',
    ],
    requiredPages: buildRequiredPages('drawing-office'),
    features: {
      leavePage: true,
      websiteBilling: true,
      loginPage: true,
      paymentPage: true,
    },
    installUrl: 'https://chrome.google.com/webstore',
  },
]

export const extensionMap = new Map(extensions.map((item) => [item.slug, item]))
