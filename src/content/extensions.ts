export type ExtensionSlug = 'deep-note' | 'drawing-office'

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
  features: {
    sharePage?: boolean
    leavePage?: boolean
    websiteBilling?: boolean
  }
  apiBase?: string
}

const deepNoteApi = import.meta.env.VITE_DEEP_NOTE_API_URL || 'https://notetaker-backend.notetaker-app-burak.workers.dev'

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
    features: {
      sharePage: true,
      leavePage: true,
      websiteBilling: true,
    },
    apiBase: deepNoteApi,
  },
  {
    slug: 'drawing-office',
    appId: 'drawing-office',
    name: 'Drawing Office',
    category: 'Chrome extension',
    tagline: 'A focused home for drawing workflows and visual capture.',
    summary: 'Drawing Office gets its own route, legal pages, support, and future pricing surface without mixing product messaging with Deep Note.',
    iconPath: '/products/drawing-office/icon.svg',
    heroBadge: 'Visual workflow hub.',
    heroTitle: 'A dedicated landing page for the Drawing Office extension.',
    heroBody:
      'Drawing Office lives under the same domain, but it stays clearly separated from every other extension. Its copy, legal pages, and support routes are independent.',
    callouts: [
      'Separate product identity under the same domain.',
      'Ready for future pricing, support, and account-linked flows.',
      'Prepared to share the same Supabase project with app-specific isolation through app_id.',
    ],
    steps: [
      'Keep product copy and visuals scoped to Drawing Office only.',
      'Attach future pricing and legal pages without touching other products.',
      'Use the same shared site shell while staying brand-separated.',
    ],
    pricingTitle: 'Drawing Office pricing placeholder',
    pricingBody:
      'This route is intentionally ready for future website billing or account flows, but it is kept separate from Deep Note.',
    proFeatures: [
      'Future premium workflows can be added here.',
      'Any account-linked behavior can stay scoped to drawing-office.',
      'This page exists so the multi-extension domain remains clean from day one.',
    ],
    supportBody:
      'Use this route for Drawing Office-specific support, legal links, and future product announcements.',
    privacySummary: [
      'Drawing Office can define its own data behavior without inheriting Deep Note wording.',
      'Keep all product disclosures extension-specific even though the domain is shared.',
    ],
    termsSummary: [
      'Drawing Office terms should be maintained separately from Deep Note terms.',
      'Shared infrastructure does not mean shared product obligations.',
    ],
    features: {
      websiteBilling: false,
    },
  },
]

export const extensionMap = new Map(extensions.map((item) => [item.slug, item]))
