export type ExtensionSlug = 'deep-note' | 'sketch-party'

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
  adminAnalyticsAppId?: string
  adminSubscriptionPath?: string
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
    adminAnalyticsAppId: 'deep-note',
    adminSubscriptionPath: '/api/admin/subscription',
  },
  {
    slug: 'sketch-party',
    appId: 'sketch-party',
    name: 'Sketch Party',
    category: 'Chrome extension',
    tagline: 'Live drawing, surprise effects, and lightweight social play between friends.',
    summary: 'Sketch Party lets signed-in users connect once, see friends again later, and send playful visual moments with live drawing, effect drops, and surprise sessions.',
    iconPath: '/products/sketch-party/icon.svg',
    heroBadge: 'Live social drawing.',
    heroTitle: 'A playful extension for sending drawings, effects, and little visual surprises.',
    heroBody:
      'Sketch Party is an account-based Chrome extension where friends can reconnect, send quick effect drops, sketch together in live mode, and keep their preferences tied to the same identity.',
    callouts: [
      'Google sign-in restores your profile, friend graph, and app-specific preferences.',
      'Quick-send effects make playful surprise moments possible without forcing a full session every time.',
      'Live mode turns the canvas into a shared back-and-forth space for social drawing.',
    ],
    steps: [
      'Sign in with Google and let Sketch Party restore your app-scoped social state.',
      'Add a friend once, then pick them from your list whenever you want to draw or send an effect.',
      'Choose between send mode, live mode, or a quick popup shortcut for faster interaction.',
    ],
    pricingTitle: 'Sketch Party Free, Pro, and the 48-hour trial',
    pricingBody:
      'Every new Sketch Party account starts with a 48-hour Pro trial. After that, the extension falls back to Free unless the user upgrades on the website, keeping billing and upgrade messaging outside the extension.',
    proFeatures: [
      'Live mode for real-time shared drawing sessions.',
      'Advanced effect packs like lightning, heart burst, bullet impact, and stickman drops.',
      'Future premium creator packs and richer sendable animations tied only to sketch-party.',
    ],
    supportBody:
      'Use this route for Sketch Party installation help, login guidance, privacy explanations, and product-specific support.',
    privacySummary: [
      'Sketch Party uses account-based identity so the same user can restore profile and app preferences after reinstalling the extension.',
      'Analytics should stay interaction-only and must not include message content, drawing payloads, or private freeform content.',
      'Product data is scoped to the sketch-party app_id even though the underlying Supabase project is shared across products.',
    ],
    termsSummary: [
      'Sketch Party is meant for playful, consensual interactions between connected users and should not be used to harass or mislead people.',
      'The product may evolve quickly while account, legal, and privacy boundaries stay specific to sketch-party.',
      'Shared infrastructure does not merge this extension\'s product obligations with other extensions on the same domain.',
    ],
    loginBody: [
      'Sketch Party uses Google sign-in so the same user can restore profile name, friend graph, and app-specific preferences after reinstalling the extension.',
      'Login belongs only to Sketch Party. Even though the Supabase project is shared, account data remains isolated through the fixed `sketch-party` app id.',
      'The extension uses Chrome-compatible OAuth flow, so users should expect a browser-based Google handoff before returning to the extension.',
    ],
    paymentBody: [
      'Sketch Party keeps upgrades on the website so the extension can stay simpler and more Chrome Web Store friendly.',
      'Users get a 48-hour Pro trial first. When the trial ends, this page becomes the upgrade handoff for restoring Pro features.',
      'Free users can still send basic effects, but Pro is where live sessions, advanced effect drops, and future creator packs will live.',
      'When checkout is connected, this route should become the single upgrade and billing handoff for sketch-party accounts.',
    ],
    requiredPages: buildRequiredPages('sketch-party'),
    features: {
      leavePage: true,
      websiteBilling: true,
      loginPage: true,
      paymentPage: true,
    },
    adminAnalyticsAppId: 'sketch-party',
    installUrl: 'https://chrome.google.com/webstore',
  },
]

export const extensionMap = new Map(extensions.map((item) => [item.slug, item]))
