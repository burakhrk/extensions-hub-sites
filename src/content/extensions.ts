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
    summary: 'Sketch Party lets friends send playful drawings and visual effects in Chrome, with guest mode for quick use and account sign-in for saved connections.',
    iconPath: '/products/sketch-party/icon.svg',
    heroBadge: 'Draw. Drop. Surprise.',
    heroTitle: 'A playful extension for sending drawings, effects, and little visual surprises.',
    heroBody:
      'Sketch Party is a playful Chrome extension for sending drawings, lightweight messages, and visual surprise effects between friends while they browse. You can jump in quickly as a guest, or sign in to keep your profile and saved connections.',
    callouts: [
      'Guest mode gives each installation a stable party code for quick temporary sessions.',
      'Account sign-in restores saved friends, preferences, and your profile on reinstall.',
      'Playful effects, live drawing, and page overlays stay optional and user-controlled.',
    ],
    steps: [
      'Open the board and copy your party code or sign in to restore your saved profile.',
      'Connect with a friend, select who you want to send to, and sketch or choose an effect.',
      'The other person sees the drawing or effect on the page they are actively viewing in Chrome.',
    ],
    pricingTitle: 'Sketch Party is launching free first',
    pricingBody:
      'Sketch Party is being prepared for a free launch with the core drawing and friend-to-friend experience available in the extension. Premium plans may be introduced later on the website when billing is ready.',
    proFeatures: [
      'Expanded effect packs and richer animated surprises.',
      'Future premium creator packs and advanced visual drop types.',
      'Possible account-linked premium upgrades managed on the website when billing is enabled.',
    ],
    supportBody:
      'Use this route for Sketch Party installation help, privacy questions, party code issues, and product-specific support.',
    privacySummary: [
      'Sketch Party stores local extension settings such as onboarding state, guest party code, and user preferences on the device so the extension can restore its own setup between sessions.',
      'If a user signs in, Sketch Party processes account identity, authentication state, saved friends, and profile preferences so the same account can be restored after reinstalling the extension.',
      'Sketch Party can transmit friend messages, drawing payloads, and effect events only as part of the real-time features the user actively uses.',
      'Some page effects temporarily inspect visible page text or page layout locally in the browser so the selected effect can be rendered on the current tab. Sketch Party is not designed to sell browsing data or build browsing history profiles.',
    ],
    termsSummary: [
      'Sketch Party is meant for playful, consensual interactions between connected users and should not be used to harass, impersonate, or mislead people.',
      'Users are responsible for the drawings, messages, and effects they choose to send through the product.',
      'Product, privacy, and support obligations remain specific to Sketch Party even when infrastructure is shared with other products on the same domain.',
    ],
    loginBody: [
      'Sketch Party can be used in guest mode for temporary sessions, or with account sign-in for saved friends and restored preferences.',
      'When account sign-in is used, it belongs only to Sketch Party and is meant to restore the same profile, friend connections, and settings across reinstalls.',
      'The extension uses a Chrome-compatible browser handoff for sign-in and then returns the user to the extension flow.',
    ],
    paymentBody: [
      'Sketch Party keeps any future upgrades on the website so the extension can stay simpler and more Chrome Web Store friendly.',
      'During the free launch period, this page should explain the product status clearly instead of pretending checkout is already live.',
      'If premium plans are introduced later, this route should become the single upgrade and billing handoff for Sketch Party accounts.',
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
