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
    summary: 'Sketch Party lets friends send playful drawings and visual effects in Chrome, with guest mode for quick use and Patreon-based account sign-in for saved connections and future Pro access.',
    iconPath: '/products/sketch-party/icon.svg',
    heroBadge: 'Draw. Drop. Surprise.',
    heroTitle: 'A playful extension for sending drawings, effects, and little visual surprises.',
    heroBody:
      'Sketch Party is a playful Chrome extension for sending drawings, lightweight messages, and visual surprise effects between friends while they browse. You can jump in quickly as a guest, or use account-linked access when you want saved connections and subscription-based features.',
    callouts: [
      'Guest mode gives each installation a stable party code for quick temporary sessions.',
      'Patreon-based account sign-in is the planned path for saved profiles, subscriptions, and restored connections.',
      'Playful effects, live drawing, and page overlays stay optional and user-controlled.',
    ],
    steps: [
      'Open the board and copy your party code, or sign in when you want a saved profile and subscription-linked access.',
      'Connect with a friend, select who you want to send to, and sketch or choose an effect.',
      'The other person sees the drawing or effect on the page they are actively viewing in Chrome.',
    ],
    pricingTitle: 'Sketch Party Free and Patreon-based Pro',
    pricingBody:
      'Sketch Party is preparing a free core experience in the extension, while Patreon-based account login and Patreon subscriptions are the planned path for Pro access, premium effects, and future paid features.',
    proFeatures: [
      'Expanded effect packs and richer animated surprises.',
      'Future premium creator packs and advanced visual drop types.',
      'Patreon-linked Pro access that can be restored with the same account later.',
    ],
    supportBody:
      'Use this route for Sketch Party installation help, Patreon login questions, privacy questions, party code issues, and product-specific support.',
    privacySummary: [
      'Sketch Party is a Chrome extension built for friend-to-friend drawing, playful visual effects, lightweight messaging, and optional page overlay experiences inside Chrome. To make those features work, Sketch Party stores certain extension settings locally on the device, such as onboarding state, guest party code, effect preferences, online visibility, and other product controls, so the extension can remember its own setup between sessions without asking the user to reconfigure everything every time the browser opens.\n\nWhen a user chooses to use an account-linked version of Sketch Party, the product may process account identity, authentication state, subscription state, saved profile details, saved friends, and account preferences so the same profile and entitlement can be restored after reinstalling the extension or switching sessions. Under the current product direction, paid access and Pro entitlements are intended to be tied to Patreon-based login and Patreon subscription status. That means Sketch Party may process Patreon-linked identity and membership state when needed to determine whether a user should receive account-linked features or paid plan access.\n\nSketch Party also processes realtime product data only as part of the features the user actively triggers. This can include friend messages, drawing payloads, effect events, session identifiers, and related delivery state needed to send a drawing, run a live session, or display a selected visual effect on a friend’s current Chrome tab. Sketch Party is not designed to sell personal data, sell browsing history, or create unrelated advertising profiles from user browsing behavior.\n\nBecause one of Sketch Party’s core features is rendering optional friend-sent drawings and playful overlays on the page the recipient is currently viewing, the extension may temporarily inspect visible page text, layout structure, or current page presentation locally in the browser so a selected effect can be positioned and rendered correctly. This access is feature-driven and user-controlled. Users can choose whether they appear online, whether they receive drawings, and whether surprise effects are allowed, and they can change those settings from the extension at any time.\n\nSketch Party is intended for playful, consensual use between connected users. If you contact support, submit uninstall feedback, or ask for product help, Sketch Party may also process the information you send for support and operational purposes. Product-specific data, legal obligations, and privacy handling remain scoped to Sketch Party even when some infrastructure is shared with other products on the same domain.',
    ],
    termsSummary: [
      'Sketch Party is provided as a product for playful, consensual interactions between users who choose to connect with each other. By using Sketch Party, users agree not to use the extension to harass, impersonate, deceive, intimidate, or otherwise abuse other people. Users are responsible for the drawings, messages, overlay effects, profile names, and other content they choose to send through the product, and they are also responsible for making sure their use of the extension fits the rules of the environments and relationships in which they use it.\n\nSketch Party may evolve over time, including changes to available features, account flows, subscription structure, supported integrations, and visual effects. Some features may be offered in guest mode, while others may depend on account-linked access or paid plans. Under the current product direction, paid access and future Pro entitlements are intended to be tied to Patreon-based login and Patreon subscription status. Sketch Party may suspend, limit, or remove access to certain features when necessary for product stability, abuse prevention, legal compliance, or operational reasons.\n\nUsers should understand that Sketch Party is built around friend-to-friend interactions and optional page overlay behavior in Chrome. That means some experiences are intentionally surprising in presentation, but they are still expected to remain consensual and user-controlled. Users should not attempt to use Sketch Party to trick, harm, stalk, or misrepresent themselves to others. Sketch Party may restrict or remove access where behavior appears abusive, disruptive, or inconsistent with the intended social and playful nature of the product.\n\nSketch Party is provided on an as-is and as-available basis to the maximum extent allowed by applicable law. While reasonable efforts may be made to keep the service stable, available, and secure, uninterrupted access, error-free operation, perfect compatibility across all websites, and permanent preservation of all product states cannot be guaranteed. Product-specific privacy, support, account, and legal obligations remain scoped to Sketch Party even when some infrastructure is shared with other products on the same domain.',
    ],
    loginBody: [
      'Sketch Party can be used in guest mode for temporary sessions, or with account-linked sign-in for saved friends, restored preferences, and future paid access.',
      'Under the current product direction, account-linked sign-in and paid access are planned around Patreon identity and Patreon subscription status rather than multiple overlapping login systems.',
      'The extension uses a Chrome-compatible browser handoff for sign-in and then returns the user to the extension flow.',
    ],
    paymentBody: [
      'Sketch Party keeps upgrades on the website so the extension can stay simpler and more Chrome Web Store friendly.',
      'Under the current product direction, Patreon-based login and Patreon subscriptions are the planned path for Pro access and future paid features.',
      'This route should become the single upgrade and billing handoff for Sketch Party accounts when Patreon checkout and entitlement sync are live.',
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
