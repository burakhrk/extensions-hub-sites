import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { extensionMap, extensions, type ExtensionDefinition, type ExtensionSlug, type PolicySection } from './content/extensions'
import { getSupabaseWebClient, getWebsiteUser, isSupabaseConfigured, signInOnWebsiteWithGoogle, signOutOnWebsite } from './lib/supabaseWeb'

type PageKey =
  | 'hub'
  | 'product'
  | 'login'
  | 'pricing'
  | 'payment'
  | 'privacy'
  | 'terms'
  | 'global-privacy'
  | 'global-terms'
  | 'support'
  | 'share'
  | 'leave'
  | 'admin'
  | 'not-found'

type BillingState = {
  appId?: string
  plan: 'basic' | 'pro'
  trialStartedAt: number | null
  trialEndsAt: number | null
  isTrialActive: boolean
  promoCodeApplied: string | null
  source: 'basic' | 'trial' | 'promo' | 'pro' | 'patreon'
  accountId: string | null
  accountEmail: string | null
  checkoutUrl?: string | null
  portalUrl?: string | null
  billingProvider?: 'website' | 'patreon'
  patreonConnected?: boolean
  patreonUserId?: string | null
  patreonCampaignId?: string | null
  patreonTierIds?: string[]
  patreonConnectedAt?: number | null
  patreonLastSyncedAt?: number | null
}

type SharedNote = {
  title?: string
  createdAt?: number
  url?: string
  summary?: string
  text?: string
  opinion?: string
  imageUrl?: string
  tags?: string[]
  highlightColor?: string
  isStarter?: boolean
}

type LeaveFeedbackReason =
  | 'too-noisy'
  | 'missing-feature'
  | 'too-buggy'
  | 'too-expensive'
  | 'using-something-else'
  | 'temporary-break'
  | 'other'

type AdminAnalyticsResponse = {
  appId?: string
  summary?: Record<string, number>
  aiUsage?: Record<string, number>
  funnels?: Record<string, number>
  topEvents?: Array<{ eventName: string; count: number }>
  screenCounts?: Array<{ screen: string; count: number }>
  promoCodes?: string[]
  users?: Array<{
    appId?: string
    clientId: string
    accountId?: string | null
    accountEmail?: string | null
    billingOverride?: 'force_basic' | null
    firstSeenAt: number
    lastSeenAt: number
    lastActiveDay: string
    activeDays: number
    totalEvents: number
    currentPlan: 'basic' | 'pro'
    subscriptionKind: 'basic' | 'trial' | 'promo' | 'pro'
    trialEndsAt?: number | null
    promoCodeApplied?: string | null
    lastEventName?: string
    linkedClientIds?: string[]
    aiUsage?: {
      total?: number
      totalRequests?: number
      summary?: number
      chat?: number
      tagSuggestions?: number
      folderSuggestions?: number
      lastUsedAt?: number | null
    }
  }>
  userJourneys?: Array<{
    clientId: string
    accountId?: string | null
    accountEmail?: string | null
    currentPlan: 'basic' | 'pro'
    subscriptionKind: 'basic' | 'trial' | 'promo' | 'pro'
    activeDays: number
    lastSeenAt: number
    events: Array<{ eventName: string; timestamp: number; screen: string | null }>
  }>
  recentEvents?: Array<{
    eventName: string
    timestamp: number
    appId?: string
    clientId?: string
    accountEmail?: string | null
    accountId?: string | null
    plan?: 'basic' | 'pro'
    subscriptionKind?: 'basic' | 'trial' | 'promo' | 'pro'
    properties?: Record<string, unknown>
  }>
  uninstallFeedback?: Array<{
    createdAt?: number
    appId?: string
    clientId?: string | null
    accountId?: string | null
    accountEmail?: string | null
    reason?: string
  details?: string | null
  }>
  supportRequests?: Array<{
    id: string
    timestamp: number
    appId?: string
    clientId?: string | null
    accountId?: string | null
    accountEmail?: string | null
    replyEmail?: string | null
    category: string
    subject: string
    message: string
    status: 'open'
  }>
}

type WebsiteHandoffIdentity = {
  source: string
  appId: string
  clientId: string
  accountId: string
  email: string
}

type WebsiteAuthState = {
  loading: boolean
  configured: boolean
  user: {
    id: string
    email: string | null
  } | null
}

type AdminDatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'

type AdminJourney = {
  userKey: string
  label: string
  totalEvents: number
  firstSeen: number
  lastSeen: number
  path: string[]
  screens: string[]
}

type AdminUserSummary = {
  userKey: string
  label: string
  clientId: string | null
  accountId: string | null
  accountEmail: string | null
  billingOverride: 'force_basic' | null
  totalEvents: number
  firstSeen: number
  lastSeen: number
  activeDays: number
  currentPlan: 'basic' | 'pro'
  subscriptionKind: 'basic' | 'trial' | 'promo' | 'pro'
  lastEventName: string | null
  linkedClientIds: string[]
  aiRequests: number
  trialEndsAt: number | null
  promoCodeApplied: string | null
}

type WebsiteTrackedPage = 'product' | 'pricing' | 'payment' | 'login' | 'support' | 'privacy' | 'terms'

type WebsitePendingAction = {
  slug: ExtensionSlug
  startedAt: number
  location: string
}

const WEBSITE_ANALYTICS_PAGE_MAP: Partial<Record<PageKey, WebsiteTrackedPage>> = {
  product: 'product',
  pricing: 'pricing',
  payment: 'payment',
  login: 'login',
  support: 'support',
  privacy: 'privacy',
  terms: 'terms',
}

const WEBSITE_ANALYTICS_CLIENT_KEY = 'extensions-hub:website-client-id'
const WEBSITE_SIGNIN_PENDING_KEY = 'extensions-hub:pending-google-signin'
const WEBSITE_PATREON_PENDING_KEY = 'extensions-hub:pending-patreon-connect'

function readWebsiteHandoff(extension: ExtensionDefinition, scope: 'login' | 'pricing' | 'payment' | 'leave'): WebsiteHandoffIdentity {
  const params = new URLSearchParams(window.location.search)
  const storageKey = `${extension.slug}:${scope}-identity`
  const stored = window.localStorage.getItem(storageKey)
  let saved: Partial<WebsiteHandoffIdentity> | null = null
  if (stored) {
    try {
      saved = JSON.parse(stored) as Partial<WebsiteHandoffIdentity>
    } catch {
      saved = null
    }
  }

  const identity: WebsiteHandoffIdentity = {
    source: params.get('source') || saved?.source || '',
    appId: params.get('appId') || saved?.appId || extension.appId,
    clientId: params.get('clientId') || saved?.clientId || '',
    accountId: params.get('accountId') || saved?.accountId || '',
    email: params.get('email') || saved?.email || '',
  }

  if (identity.clientId || identity.accountId || identity.email) {
    window.localStorage.setItem(storageKey, JSON.stringify(identity))
  }

  return identity
}

function useWebsiteAuthState(): WebsiteAuthState {
  const [state, setState] = useState<WebsiteAuthState>({
    loading: isSupabaseConfigured(),
    configured: isSupabaseConfigured(),
    user: null,
  })

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({
        loading: false,
        configured: false,
        user: null,
      })
      return
    }

    let cancelled = false
    const supabase = getSupabaseWebClient()

    const load = async () => {
      const user = await getWebsiteUser()
      if (cancelled) return
      setState({
        loading: false,
        configured: true,
        user: user ? { id: user.id, email: user.email ?? null } : null,
      })
    }

    void load()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setState({
        loading: false,
        configured: true,
        user: session?.user ? { id: session.user.id, email: session.user.email ?? null } : null,
      })
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  return state
}

function getLocalDateLabel(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDatePresetRange(preset: AdminDatePreset, customDate: string): { start: string | null; end: string | null; label: string } {
  const now = new Date()
  const today = getLocalDateLabel(now)

  if (preset === 'all') {
    return {
      start: null,
      end: null,
      label: 'all time',
    }
  }

  if (preset === 'custom') {
    return {
      start: customDate || null,
      end: customDate || null,
      label: customDate ? customDate : 'any time',
    }
  }

  if (preset === 'today') {
    return { start: today, end: today, label: 'today' }
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const value = getLocalDateLabel(yesterday)
    return { start: value, end: value, label: 'yesterday' }
  }

  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - (preset === 'last7' ? 6 : 29))
  return {
    start: getLocalDateLabel(startDate),
    end: today,
    label: preset === 'last7' ? 'last 7 days' : 'last 30 days',
  }
}

function formatMetricLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPercent(value: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function formatShortDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function buildUserKey(accountId?: string | null, clientId?: string | null): string {
  if (accountId) return `account:${accountId}`
  return `client:${clientId || 'anonymous'}`
}

function getUserLabel(user: { accountEmail?: string | null; accountId?: string | null; clientId?: string | null }): string {
  return user.accountEmail || user.accountId || user.clientId || 'Anonymous user'
}

function getWebsiteAnalyticsClientId(): string {
  const existing = window.localStorage.getItem(WEBSITE_ANALYTICS_CLIENT_KEY)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.localStorage.setItem(WEBSITE_ANALYTICS_CLIENT_KEY, next)
  return next
}

function getReferrerHost(): string | null {
  if (!document.referrer) return null
  try {
    return new URL(document.referrer).hostname || null
  } catch {
    return null
  }
}

function getVisitSource(): string {
  const params = new URLSearchParams(window.location.search)
  const handoffSource = params.get('source')
  if (handoffSource) return handoffSource
  const utmSource = params.get('utm_source')
  if (utmSource) return utmSource
  const referrerHost = getReferrerHost()
  if (!referrerHost) return 'direct'
  if (referrerHost === window.location.hostname) return 'internal'
  return referrerHost
}

function readPendingAction(storageKey: string): WebsitePendingAction | null {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WebsitePendingAction
  } catch {
    return null
  }
}

function writePendingAction(storageKey: string, slug: ExtensionSlug): void {
  window.localStorage.setItem(storageKey, JSON.stringify({
    slug,
    startedAt: Date.now(),
    location: window.location.pathname,
  } satisfies WebsitePendingAction))
}

function clearPendingAction(storageKey: string): void {
  window.localStorage.removeItem(storageKey)
}

function getWebsiteSubscriptionKind(state?: BillingState | null): 'basic' | 'trial' | 'promo' | 'pro' {
  if (!state) return 'basic'
  if (state.source === 'trial') return 'trial'
  if (state.source === 'promo') return 'promo'
  if (state.source === 'pro' || state.source === 'patreon' || state.plan === 'pro') return 'pro'
  return 'basic'
}

async function trackWebsiteEvent(options: {
  extension: ExtensionDefinition
  page: WebsiteTrackedPage
  eventName: string
  authUser?: { id: string; email: string | null } | null
  identity?: Partial<WebsiteHandoffIdentity> | null
  billingState?: BillingState | null
  properties?: Record<string, unknown>
}): Promise<void> {
  const { extension, page, eventName, authUser, identity, billingState, properties } = options
  if (!extension.apiBase) return

  const params = new URLSearchParams(window.location.search)
  const clientId = identity?.clientId || identity?.accountId || authUser?.id || getWebsiteAnalyticsClientId()
  const accountId = identity?.accountId || authUser?.id || null
  const accountEmail = identity?.email || authUser?.email || null

  const payload = {
    id: crypto.randomUUID(),
    appId: extension.appId,
    clientId,
    accountId,
    accountEmail,
    eventName,
    timestamp: Date.now(),
    plan: billingState?.plan === 'pro' ? 'pro' : 'basic',
    subscriptionKind: getWebsiteSubscriptionKind(billingState),
    properties: {
      appId: extension.appId,
      pageKey: page,
      screen: `website-${page}`,
      routePath: window.location.pathname,
      visitSource: getVisitSource(),
      handoffSource: params.get('source') || null,
      referrerHost: getReferrerHost(),
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      ...properties,
    },
  }

  await fetch(`${extension.apiBase}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined)
}

async function startWebsiteGoogleSignIn(extension: ExtensionDefinition, origin: string): Promise<void> {
  writePendingAction(WEBSITE_SIGNIN_PENDING_KEY, extension.slug)
  await trackWebsiteEvent({
    extension,
    page: WEBSITE_ANALYTICS_PAGE_MAP[parseRoute(window.location.pathname).page] || 'login',
    eventName: 'Website Sign In Started',
    properties: {
      ctaOrigin: origin,
    },
  })
  await signInOnWebsiteWithGoogle(window.location.href)
}

function parseRoute(pathname: string): { page: PageKey; extension: ExtensionDefinition | null; shareSlug: string | null } {
  if (pathname === '/' || pathname === '') return { page: 'hub', extension: null, shareSlug: null }
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'admin') return { page: 'admin', extension: null, shareSlug: null }
  if (parts[0] === 'privacy') return { page: 'global-privacy', extension: null, shareSlug: null }
  if (parts[0] === 'terms') return { page: 'global-terms', extension: null, shareSlug: null }
  const normalizedFirst = parts[0] === 'drawing-office' ? 'sketch-party' : parts[0]
  const first = normalizedFirst as ExtensionSlug | undefined
  const extension = first ? extensionMap.get(first) || null : null
  if (!extension) return { page: 'not-found', extension: null, shareSlug: null }
  if (parts.length === 1) return { page: 'product', extension, shareSlug: null }
  const second = parts[1]
  if (second === 'login' && extension.features.loginPage) return { page: 'login', extension, shareSlug: null }
  if (second === 'pricing') return { page: 'pricing', extension, shareSlug: null }
  if (second === 'payment' && extension.features.paymentPage) return { page: 'payment', extension, shareSlug: null }
  if (second === 'privacy') return { page: 'privacy', extension, shareSlug: null }
  if (second === 'terms') return { page: 'terms', extension, shareSlug: null }
  if (second === 'support') return { page: 'support', extension, shareSlug: null }
  if (second === 'leave' && extension.features.leavePage) return { page: 'leave', extension, shareSlug: null }
  if (second === 'share' && extension.features.sharePage && parts[2]) return { page: 'share', extension, shareSlug: parts[2] }
  return { page: 'not-found', extension, shareSlug: null }
}

function GlobalPolicyPage({ title, eyebrow, items }: { title: string; eyebrow: string; items: PolicySection[] }) {
  return (
    <LegalDocument
      eyebrow={eyebrow}
      title={title}
      intro="These policies cover the shared website layer and OAuth clients used across Harika Extensions products. Product-specific routes may add extra details where needed."
      items={items}
    />
  )
}

function LegalDocument({
  eyebrow,
  title,
  intro,
  items,
}: {
  eyebrow: string
  title: string
  intro: string
  items: PolicySection[]
}) {
  return (
    <section className="article-card legal-document">
      <div className="pill">{eyebrow}</div>
      <h1>{title}</h1>
      <p className="article-intro">{intro}</p>
      <div className="legal-layout">
        <aside className="legal-aside">
          <div className="section-label">Sections</div>
          <ol className="legal-toc">
            {items.map((item, index) => {
              const anchor = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              return (
                <li key={item.title}>
                  <span>{`${index + 1}.`}</span>
                  <a href={`#${anchor}`}>{item.title}</a>
                </li>
              )
            })}
          </ol>
        </aside>
        <div className="legal-content">
          {items.map((item) => {
            const anchor = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            return (
              <section key={item.title} id={anchor} className="legal-section">
                <h2>{item.title}</h2>
                {item.body.map((paragraph, index) => <p key={`${item.title}-${index}`}>{paragraph}</p>)}
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const GLOBAL_PRIVACY_SECTIONS: PolicySection[] = [
  {
    title: 'Shared website scope',
    body: [
      'Harika Extensions operates a shared website layer for multiple browser extension products. The shared website may host landing pages, login handoff pages, support routes, pricing pages, payment handoff flows, and shared legal pages for those products.',
      'As part of those flows, the website may process limited account context such as extension app id, signed-in account id, email address, billing state, and support context when a user moves between an extension and the website.',
    ],
  },
  {
    title: 'How shared account context is used',
    body: [
      'When a user signs in on the website, the goal is to keep the same account in sync with the related extension. Depending on the product, this may include Google-based account identity, Patreon-linked entitlement checks, support requests, and analytics about product usage.',
      'Sensitive freeform content such as private notes, drawings, or personal messages should only be processed when a specific product feature requires it and that product’s own policy allows it.',
    ],
  },
  {
    title: 'Product separation',
    body: [
      'Harika Extensions does not use the shared website to merge unrelated products into a single undifferentiated user-facing account without context. Extension routes remain product-scoped, and billing or entitlement checks remain tied to the relevant extension app id.',
      'Shared infrastructure may be reused, but product-specific privacy expectations remain tied to the relevant product routes and product documents.',
    ],
  },
]

const GLOBAL_TERMS_SECTIONS: PolicySection[] = [
  {
    title: 'Shared website role',
    body: [
      'Harika Extensions provides a shared website layer for multiple browser extension products. Each extension remains responsible for its own product behavior, user-facing functionality, privacy handling, billing logic, and product-specific obligations.',
    ],
  },
  {
    title: 'Acceptable use',
    body: [
      'Users agree not to misuse the website, shared OAuth handoff flows, or extension-specific routes for abuse, impersonation, automated scraping, credential misuse, or attempts to access another user’s extension data.',
      'Product-specific features, eligibility, and subscription logic may vary by extension and may change over time as products evolve.',
    ],
  },
  {
    title: 'Service changes and liability',
    body: [
      'The shared site and related extension services are provided on an as-is and as-available basis to the maximum extent allowed by law. Harika Extensions may update routes, account flows, billing providers, and supporting services over time.',
      'Product-specific terms, privacy disclosures, and support expectations continue to apply on top of these shared website terms where relevant.',
    ],
  },
]

function AppShell({ children, extension, page }: { children: ReactNode; extension: ExtensionDefinition | null; page: PageKey }) {
  const auth = useWebsiteAuthState()
  const brandHref = extension ? `/${extension.slug}` : '/'

  useEffect(() => {
    const trackedPage = WEBSITE_ANALYTICS_PAGE_MAP[page]
    if (!extension || !trackedPage) return
    void trackWebsiteEvent({
      extension,
      page: trackedPage,
      eventName: `Website ${trackedPage[0].toUpperCase()}${trackedPage.slice(1)} Viewed`,
      authUser: auth.user,
    })
  }, [extension, page])

  useEffect(() => {
    if (!extension || !auth.user) return
    const pending = readPendingAction(WEBSITE_SIGNIN_PENDING_KEY)
    if (!pending || pending.slug !== extension.slug) return
    clearPendingAction(WEBSITE_SIGNIN_PENDING_KEY)
    void trackWebsiteEvent({
      extension,
      page: WEBSITE_ANALYTICS_PAGE_MAP[page] || 'login',
      eventName: 'Website Sign In Completed',
      authUser: auth.user,
      properties: {
        startedAt: pending.startedAt,
        returnPage: page,
      },
    })
  }, [auth.user, extension, page])

  return (
    <div className="site-shell">
      {page !== 'admin' ? (
        <div className="floating-background" aria-hidden="true">
          <span className="floating-shape floating-shape-one" />
          <span className="floating-shape floating-shape-two" />
          <span className="floating-shape floating-shape-three" />
        </div>
      ) : null}
      <div className={`site-frame ${page === 'admin' ? 'site-frame-admin' : ''}`}>
        <header className="topbar">
          <a className="brand" href={brandHref}>
            <img className="brand-mark-image" src="/harika-extensions-icon.png" alt="Harika Extensions" />
            <div>
              <div className="brand-title">Extensions Hub</div>
              <div className="brand-subtitle">{extension ? `${extension.name} on the web` : 'Discover browser tools built for real workflows'}</div>
            </div>
          </a>
          <nav className="topnav">
            {extension ? (
              <>
                <a className={page === 'product' ? 'is-active' : ''} href={`/${extension.slug}`}>Home</a>
                {!auth.user ? (
                  <button
                    className={`topnav-button ${page === 'login' ? 'is-active' : ''}`}
                    onClick={() => {
                      void startWebsiteGoogleSignIn(extension, 'topnav')
                    }}
                  >
                    Login
                  </button>
                ) : null}
                <a
                  className={page === 'payment' || page === 'pricing' ? 'is-active' : ''}
                  href={`/${extension.slug}/payment`}
                  onClick={() => {
                    void trackWebsiteEvent({
                      extension,
                      page: WEBSITE_ANALYTICS_PAGE_MAP[page] || 'product',
                      eventName: 'Website Upgrade Opened',
                      authUser: auth.user,
                      properties: { ctaOrigin: 'topnav' },
                    })
                  }}
                >
                  Upgrade to Pro
                </a>
                {auth.user ? (
                  <button
                    className="topnav-button"
                    onClick={() => {
                      void signOutOnWebsite()
                    }}
                  >
                    Log out
                  </button>
                ) : null}
              </>
            ) : <a className={page === 'hub' ? 'is-active' : ''} href="/">Home</a>}
          </nav>
        </header>
        {extension && auth.user ? (
          <div className="session-strip">
            <span>Signed in as <strong>{auth.user.email || auth.user.id}</strong></span>
          </div>
        ) : null}
        <main className="main-content">{children}</main>
        <footer className="footer">
          <span>{extension ? `${extension.name} stays scoped to its own route.` : 'One domain, many extensions.'}</span>
          {extension ? (
            <span className="footer-links">
              <a href={`/${extension.slug}/privacy`}>Privacy</a>
              <a href={`/${extension.slug}/terms`}>Terms</a>
              <a href={`/${extension.slug}/support`}>Support</a>
            </span>
          ) : <span>Each product keeps its own website, support flow, and account handoff.</span>}
        </footer>
      </div>
    </div>
  )
}

function HubPage() {
  return (
    <div className="stack-lg">
      <section className="hero-card">
        <div className="pill">Browser tools</div>
        <h1>Useful extensions, each with its own clear home on the web.</h1>
        <p>Explore products, install the ones you need, and open the matching support, pricing, privacy, and account pages without getting dropped into the wrong app.</p>
      </section>
      <section className="product-grid">
        {extensions.map((extension) => (
          <a key={extension.slug} className="product-card" href={`/${extension.slug}`}>
            <img src={extension.iconPath} alt={extension.name} className="product-icon" />
            <div className="product-type">{extension.category}</div>
            <h2>{extension.name}</h2>
            <p>{extension.summary}</p>
            <span className="product-link">Open product page</span>
          </a>
        ))}
      </section>
    </div>
  )
}

function ProductHome({ extension }: { extension: ExtensionDefinition }) {
  const auth = useWebsiteAuthState()
  const otherProducts = extensions.filter((item) => item.slug !== extension.slug)
  const [state, setState] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(Boolean(extension.apiBase && auth.user?.id))

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!extension.apiBase || !auth.user?.id) {
        setLoading(false)
        return
      }

      try {
        const query = new URLSearchParams({
          appId: extension.appId,
          clientId: auth.user.id,
          accountId: auth.user.id,
        })
        if (auth.user.email) query.set('email', auth.user.email)
        const res = await fetch(`${extension.apiBase}/api/billing/state?${query.toString()}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Billing state could not be loaded.')
        if (!cancelled) setState(data as BillingState)
      } catch {
        if (!cancelled) setState(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [auth.user?.email, auth.user?.id, extension.apiBase, extension.appId])

  return (
    <div className="stack-lg">
      <section className="hero-card product-hero-card">
        <div className="hero-grid">
          <div>
            <div className="pill">{extension.heroBadge}</div>
            <div className="product-hero-head">
              <img src={extension.iconPath} alt={extension.name} className="hero-icon" />
              <div>
                <div className="eyebrow">{extension.name}</div>
                <h1>{extension.tagline}</h1>
              </div>
            </div>
            <p>{extension.summary}</p>
            <div className="cta-row">
              {extension.installUrl ? (
                <a
                  className="primary-cta"
                  href={extension.installUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void trackWebsiteEvent({
                      extension,
                      page: 'product',
                      eventName: 'Website Install Clicked',
                      authUser: auth.user,
                      billingState: state,
                    })
                  }}
                >
                  Install extension
                </a>
              ) : null}
              {!auth.user ? (
                <button
                  className="secondary-cta"
                  onClick={() => {
                    void startWebsiteGoogleSignIn(extension, 'product-hero')
                  }}
                >
                  Login
                </button>
              ) : null}
              <a
                className="primary-cta"
                href={`/${extension.slug}/payment`}
                onClick={() => {
                  void trackWebsiteEvent({
                    extension,
                    page: 'product',
                    eventName: 'Website Upgrade Opened',
                    authUser: auth.user,
                    billingState: state,
                    properties: { ctaOrigin: 'product-hero' },
                  })
                }}
              >
                Upgrade to Pro
              </a>
            </div>
            <div className="hero-meta-row">
              <div className="hero-meta-pill">
                <span>Status</span>
                <strong>{auth.user ? 'Account connected' : 'Guest browsing'}</strong>
              </div>
              <div className="hero-meta-pill">
                <span>Plan</span>
                <strong>{loading ? 'Checking...' : state?.plan === 'pro' ? 'Pro' : 'Free'}</strong>
              </div>
              <div className="hero-meta-pill">
                <span>Best for</span>
                <strong>Saving useful things fast</strong>
              </div>
            </div>
          </div>
          <div className="hero-preview-shell" aria-hidden="true">
            <div className="hero-preview-note hero-preview-note-primary">
              <div className="hero-preview-top">
                <span className="mini-pill">Captured note</span>
                <span className="hero-preview-dot" />
              </div>
              <strong>{extension.tagline}</strong>
              <p>{extension.callouts[0]}</p>
              <div className="hero-preview-tags">
                <span>Summary</span>
                <span>Folders</span>
                <span>AI help</span>
              </div>
            </div>
            <div className="hero-preview-note hero-preview-note-secondary">
              <div className="section-label">Why it works</div>
              <ul className="simple-list feature-list">
                {extension.callouts.slice(0, 2).map((item) => <li key={`hero-${item}`}>{item}</li>)}
              </ul>
            </div>
            <div className="hero-preview-note hero-preview-note-tertiary">
              <div className="section-label">Pro</div>
              <p>Upgrade on the web and return with the right plan already linked.</p>
            </div>
          </div>
        </div>
        {auth.user ? (
          <div className="plan-strip">
            <span>Signed in as <strong>{auth.user.email || auth.user.id}</strong></span>
            <span>
              Current plan: <strong>{loading ? 'Checking...' : state?.plan === 'pro' ? 'Pro' : 'Free'}</strong>
              {state?.source ? ` via ${state.source}` : ''}
            </span>
          </div>
        ) : null}
      </section>
      <section className="two-col product-story-grid">
        <div className="editorial-section compact-editorial-section story-panel">
          <div className="section-label">What Deep Note does</div>
          <div className="editorial-copy">
            <p>{extension.summary}</p>
            <p>{extension.heroBody}</p>
          </div>
          <div className="review-facts-grid">
            <article className="review-fact-card">
              <span>Works in</span>
              <strong>Chrome extension workflow</strong>
              <p>Capture while browsing, then come back later to review and organize what you saved.</p>
            </article>
            <article className="review-fact-card">
              <span>Billing</span>
              <strong>Handled on the website</strong>
              <p>Upgrade on the website so the same signed-in account can carry the right plan back into the extension.</p>
            </article>
            <article className="review-fact-card">
              <span>Data style</span>
              <strong>Local-first with account features</strong>
              <p>Core notes stay local by default. Account-linked features handle sync, billing, sharing, and support.</p>
            </article>
          </div>
          <div className="highlight-grid">
            {extension.callouts.map((item) => (
              <article key={item} className="highlight-card">
                <div className="section-label">Highlight</div>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="editorial-section compact-editorial-section story-panel story-panel-accent">
          <div className="section-label">What Pro adds</div>
          <div className="editorial-copy">
            <p>Pro is for people who want faster organization and better recall from what they save.</p>
          </div>
          <ul className="simple-list feature-list">
            {extension.proFeatures.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
        </div>
      </section>
      <section className="editorial-section story-panel">
        <div className="section-label">What people actually save</div>
        <div className="examples-grid">
          <article className="example-note-card">
            <div className="example-note-top">
              <span className="mini-pill">Quick capture</span>
              <span className="example-note-color tone-mint" />
            </div>
            <strong>Interesting paragraph from an article</strong>
            <p>Save the line now, add your own thought, and come back later with a short summary already attached.</p>
            <div className="example-note-tags">
              <span>Research</span>
              <span>Summary</span>
            </div>
          </article>
          <article className="example-note-card">
            <div className="example-note-top">
              <span className="mini-pill">Organized note</span>
              <span className="example-note-color tone-sky" />
            </div>
            <strong>Saved into the right folder</strong>
            <p>Turn scattered captures into a clean note stack with folders, tags, and a clearer place to revisit them.</p>
            <div className="example-note-tags">
              <span>Folders</span>
              <span>Review later</span>
            </div>
          </article>
          <article className="example-note-card example-note-card-accent">
            <div className="example-note-top">
              <span className="mini-pill">Pro workflow</span>
              <span className="example-note-color tone-ink" />
            </div>
            <strong>Ask AI across your saved notes</strong>
            <p>Use Pro to summarize what you saved, suggest structure, and chat across notes without rebuilding context each time.</p>
            <div className="example-note-tags">
              <span>AI help</span>
              <span>Knowledge chat</span>
            </div>
          </article>
        </div>
      </section>
      <section className="section-stack">
        <div className="section-heading-block">
          <div className="section-label">Choose your plan</div>
          <h2>Start free. Upgrade when you want more.</h2>
          <p>Use the core workflow for free, then move to Pro if the extra AI workflow feels worth it.</p>
        </div>
      <section className="plan-compare-grid">
        <div className="plan-compare-card">
          <div className="section-label">Free</div>
          <h3>Start using the extension right away.</h3>
          <ul className="simple-list feature-list">
            <li>Core capture and product workflow inside the extension.</li>
            <li>Website sign-in to keep the same account connected.</li>
            <li>Basic access while you decide whether Pro is worth it for you.</li>
          </ul>
        </div>
        <div className="plan-compare-card plan-compare-card-accent">
          <div className="section-label">Pro</div>
          <h3>Unlock the premium workflow for {extension.name}.</h3>
          <ul className="simple-list feature-list">
            {extension.proFeatures.map((feature) => <li key={`pro-${feature}`}>{feature}</li>)}
          </ul>
        </div>
      </section>
      </section>
      <section className="editorial-section story-panel">
        <div className="section-label">How people use {extension.name}</div>
        <ol className="step-list editorial-steps">
          {extension.steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="editorial-section story-panel story-panel-accent">
        <div className="section-label">Before you install</div>
        <div className="submission-checklist">
          <div className="submission-check-card">
            <strong>Capture while browsing</strong>
            <p>Save useful text, screenshots, or quick thoughts from the page you are on.</p>
          </div>
          <div className="submission-check-card">
            <strong>Sign in only when needed</strong>
            <p>Google sign-in is for account-linked restore, website billing, and support context.</p>
          </div>
          <div className="submission-check-card">
            <strong>Get help quickly</strong>
            <p>Privacy, terms, support, and payment pages stay on this site so those flows are easy to find.</p>
          </div>
        </div>
      </section>
      <section className="editorial-section products-footer-section">
        <div className="section-label">Our products</div>
        <div className="products-footer-head">
          <p>Want to explore the rest of the Harika Extensions lineup? You can stay inside this product flow or jump back to the main landing page.</p>
          <a className="secondary-cta inline-cta" href="/">Open hub landing</a>
        </div>
        <div className="products-footer-grid">
          {otherProducts.map((item) => (
            <a key={item.slug} className="products-footer-card" href={`/${item.slug}`}>
              <img src={item.iconPath} alt={item.name} className="product-icon" />
              <div>
                <strong>{item.name}</strong>
                <p>{item.summary}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

function PricingPage({ extension }: { extension: ExtensionDefinition }) {
  const params = new URLSearchParams(window.location.search)
  const patreonStatus = params.get('patreon')
  const [identity] = useState(() => readWebsiteHandoff(extension, 'pricing'))
  const auth = useWebsiteAuthState()
  const [state, setState] = useState<BillingState | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(extension.apiBase && (identity.clientId || auth.user?.id)))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const effectiveClientId = identity.clientId || identity.accountId || auth.user?.id || ''
      const effectiveAccountId = identity.accountId || auth.user?.id || ''
      const effectiveEmail = identity.email || auth.user?.email || ''

        if (!extension.apiBase || !effectiveClientId || !effectiveAccountId) {
        setLoading(false)
        return
      }
      try {
        const query = new URLSearchParams({ clientId: effectiveClientId, accountId: effectiveAccountId, appId: extension.appId })
        if (effectiveEmail) query.set('email', effectiveEmail)
        const res = await fetch(`${extension.apiBase}/api/billing/state?${query.toString()}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Billing state could not be loaded.')
        if (!cancelled) setState(data as BillingState)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Billing state could not be loaded.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [auth.user?.email, auth.user?.id, extension.apiBase, identity])

  const trialEndsLabel = state?.trialEndsAt ? new Date(state.trialEndsAt).toLocaleString() : null
  const patreonLastSyncedLabel = state?.patreonLastSyncedAt ? new Date(state.patreonLastSyncedAt).toLocaleString() : null
  const identityEmail = identity.email || state?.accountEmail || ''
  const isSyncedUser = Boolean(auth.user && identity.accountId && auth.user.id === identity.accountId)
  const isDifferentUser = Boolean(auth.user && identity.accountId && auth.user.id !== identity.accountId)
  const isPatreonBilling = extension.billingProvider === 'patreon'
  const planLabel = loading ? 'Checking...' : state?.plan === 'pro' ? 'Pro active' : 'Free plan'
  const patreonStatusLabel = state?.patreonConnected ? 'Linked' : 'Not linked'

  return (
      <div className="stack-lg">
        <section className="hero-card pricing-hero-card">
          <div className="pricing-hero-grid">
            <div className="pricing-hero-copy">
              <div className="pill">{extension.name} pricing</div>
              <h1>{extension.pricingTitle}</h1>
              <p>Use Deep Note for free, then upgrade to Pro for faster organization and note-based AI help.</p>
              <div className="pricing-hero-inline">
                <div className="hero-meta-pill">
                  <span>Current plan</span>
                  <strong>{planLabel}</strong>
                </div>
                <div className="hero-meta-pill">
                  <span>Patreon</span>
                  <strong>{patreonStatusLabel}</strong>
                </div>
                <div className="hero-meta-pill">
                  <span>Price</span>
                  <strong>{extension.priceLabel || '$5 / month'}</strong>
                </div>
              </div>
            </div>
            <div className="pricing-preview-card" aria-hidden="true">
              <div className="pricing-preview-top">
                <span className="mini-pill">Pro preview</span>
                <span className="hero-preview-dot" />
              </div>
              <strong>What Pro feels like</strong>
              <p>Save a note, summarize it fast, and come back later with less cleanup and less searching.</p>
              <div className="pricing-preview-tags">
                <span>AI summary</span>
                <span>Smart tags</span>
                <span>Folder suggestions</span>
              </div>
            </div>
          </div>
        </section>
        <section className="two-col pricing-layout pricing-system-grid">
          <div className="stack-md">
            <section className="story-panel pricing-panel">
              <div className="section-label">Account</div>
              <p><strong>Google account:</strong> {auth.user?.email || identityEmail || 'Sign in from the extension first'}</p>
              {identity.source ? <p><strong>Opened from:</strong> {identity.source}</p> : null}
              {auth.loading ? <p>Checking website session...</p> : null}
              {auth.configured && !auth.user ? (
                <div className="auth-inline-box">
                  <p>Sign in with the same Google account you use in the extension.</p>
                  <button
                    className="button-cta inline-cta"
                    onClick={() => {
                      setAuthError(null)
                      void startWebsiteGoogleSignIn(extension, 'pricing-account').catch((err) => setAuthError(err instanceof Error ? err.message : 'Website sign-in failed.'))
                    }}
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : null}
              {auth.user ? (
                <div className={`sync-status-card ${isDifferentUser ? 'is-warning' : 'is-success'}`}>
                  <strong>{isDifferentUser ? 'Different account detected' : isSyncedUser ? 'Website and extension are synced' : 'Website session active'}</strong>
                  <p>
                    {isDifferentUser
                      ? `Website: ${auth.user.email || auth.user.id} | Extension: ${identityEmail || identity.accountId}`
                      : auth.user.email || auth.user.id}
                  </p>
                  <div className="cta-row compact-cta-row">
                    <button className="secondary-cta" onClick={() => void signOutOnWebsite().catch((err) => setAuthError(err instanceof Error ? err.message : 'Sign out failed.'))}>Sign out</button>
                  </div>
                </div>
              ) : null}
              {authError ? <p className="warning">{authError}</p> : null}
            </section>

            <section className="story-panel pricing-panel">
              <div className="section-label">How it works</div>
              <ol className="step-list pricing-step-list">
                <li>
                  <span>1</span>
                  <p>Sign in with the same Google account you use in the extension.</p>
                </li>
                <li>
                  <span>2</span>
                  <p>Open payment and connect the Patreon account with your membership.</p>
                </li>
                <li>
                  <span>3</span>
                  <p>Return to the extension with Pro already linked.</p>
                </li>
              </ol>
            </section>
          </div>

          <div className="stack-md">
            <section className="story-panel story-panel-accent pricing-panel pricing-panel-accent">
              <div className="section-label">Plans</div>
              <div className="compact-plan-hero">
                <div className="plan-compare-card">
                  <div className="section-label">Free</div>
                  <h3>Use the core workflow.</h3>
                  <ul className="simple-list feature-list">
                    <li>Save and organize notes inside the extension.</li>
                    <li>Keep the same account connected across extension and website.</li>
                    <li>Upgrade later only if you want more AI help.</li>
                  </ul>
                </div>
                <div className="plan-compare-card plan-compare-card-accent">
                  <div className="section-label">Pro</div>
                  <h3>{extension.priceLabel || '$5 / month'}</h3>
                  <ul className="simple-list feature-list">
                    {extension.proFeatures.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
              {loading ? <p>Loading billing state...</p> : null}
              {error ? <p className="warning">{error}</p> : null}
              {patreonStatus === 'connected' ? <p className="success"><strong>Patreon connected.</strong> Your membership was synced back to this extension account.</p> : null}
              {patreonStatus === 'failed' ? <p className="warning">Patreon connection did not complete. Try again from this page.</p> : null}
              {!loading && state?.source === 'promo' ? <p><strong>Promo active.</strong> {trialEndsLabel ? ` Pro access ends ${trialEndsLabel}.` : ' Pro access lasts 30 days from redemption.'}</p> : null}
              {!loading && state?.isTrialActive ? <p><strong>Trial active.</strong> {trialEndsLabel ? ` Ends ${trialEndsLabel}.` : ''}</p> : null}
              {state?.patreonConnected ? <p><strong>Connected Patreon:</strong> {state.patreonUserId || 'Connected'}</p> : null}
              {state?.patreonTierIds?.length ? <p><strong>Entitled tiers:</strong> {state.patreonTierIds.join(', ')}</p> : null}
              {patreonLastSyncedLabel ? <p><strong>Last Patreon sync:</strong> {patreonLastSyncedLabel}</p> : null}
              {isPatreonBilling ? <p className="muted-copy">Membership access refreshes automatically about every 6 hours, so billing changes may take a little time to appear.</p> : null}
              <div className="cta-row compact-cta-row">
                <a
                  className="button-cta inline-cta"
                  href={`/${extension.slug}/payment`}
                  onClick={() => {
                    void trackWebsiteEvent({
                      extension,
                      page: 'pricing',
                      eventName: 'Website Upgrade Opened',
                      authUser: auth.user,
                      identity,
                      billingState: state,
                      properties: { ctaOrigin: 'pricing-primary' },
                    })
                  }}
                >
                  {state?.patreonConnected ? 'View Pro access' : 'Open upgrade page'}
                </a>
              </div>
            </section>
            <div className="pricing-inline-note">
              <span>Current access</span>
              <strong>{planLabel}</strong>
            </div>
          </div>
        </section>
      </div>
    )
  }

function LoginPage({ extension }: { extension: ExtensionDefinition }) {
  const [identity] = useState(() => readWebsiteHandoff(extension, 'login'))
  const auth = useWebsiteAuthState()
  const [authError, setAuthError] = useState<string | null>(null)
  const isSyncedUser = Boolean(auth.user && identity.accountId && auth.user.id === identity.accountId)
  const isDifferentUser = Boolean(auth.user && identity.accountId && auth.user.id !== identity.accountId)

    return (
      <section className="article-card">
        <div className="pill">Google sign-in</div>
        <h1>{extension.name} login</h1>
        <p className="article-intro">Use the same Google account you use in the extension so website access and billing stay tied to the right Deep Note account.</p>
        <div className="editorial-section compact-editorial-section">
          <div className="stack-sm content-flow">
            <p><strong>Website session:</strong> {auth.loading ? 'Checking...' : auth.user?.email || 'Not signed in'}</p>
            {auth.user ? (
              <div className={`sync-status-card ${isDifferentUser ? 'is-warning' : 'is-success'}`}>
              <strong>{isDifferentUser ? 'This is not the same account as the extension handoff' : isSyncedUser ? 'Same account on website and extension' : 'Website session active'}</strong>
              <p>
                {isDifferentUser
                  ? `Website: ${auth.user.email || auth.user.id} | Extension: ${identity.email || identity.accountId}`
                  : auth.user.email || auth.user.id}
              </p>
            </div>
          ) : null}
          <div className="cta-row compact-cta-row">
            {auth.user ? (
              <button
                className="secondary-cta"
                onClick={() => {
                  setAuthError(null)
                  void signOutOnWebsite().catch((err) => setAuthError(err instanceof Error ? err.message : 'Website sign-out failed.'))
                }}
              >
                Sign out on website
              </button>
            ) : (
              <button
                className="button-cta inline-cta"
                onClick={() => {
                  setAuthError(null)
                  void startWebsiteGoogleSignIn(extension, 'login-page').catch((err) => setAuthError(err instanceof Error ? err.message : 'Website sign-in failed.'))
                }}
                disabled={!auth.configured}
              >
                Sign in with Google
              </button>
            )}
            </div>
            {!auth.configured ? <p className="warning">Supabase website auth is not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on this site.</p> : null}
            {authError ? <p className="warning">{authError}</p> : null}
          </div>
        </div>
        {identity.email || identity.accountId ? (
          <div className="editorial-section compact-editorial-section">
            <p><strong>Detected account:</strong> {identity.email || identity.accountId}</p>
            <p>This matches the account context passed from the extension.</p>
            {identity.source ? <p><strong>Opened from:</strong> {identity.source}</p> : null}
          </div>
        ) : null}
        <div className="editorial-section">
          <div className="editorial-copy">
            {extension.loginBody.map((item) => <p key={item}>{item}</p>)}
          </div>
        </div>
        <div className="cta-row">
          {extension.installUrl ? <a className="primary-cta" href={extension.installUrl} target="_blank" rel="noreferrer">Install extension</a> : null}
          <a
            className="primary-cta"
            href={`/${extension.slug}/payment`}
            onClick={() => {
              void trackWebsiteEvent({
                extension,
                page: 'login',
                eventName: 'Website Upgrade Opened',
                authUser: auth.user,
                identity,
                properties: { ctaOrigin: 'login-page' },
              })
            }}
          >
            Open upgrade page
          </a>
      </div>
    </section>
  )
}

function PaymentPage({ extension }: { extension: ExtensionDefinition }) {
  const params = new URLSearchParams(window.location.search)
  const paymentStatus = params.get('status')
  const paymentReason = params.get('reason')
  const [identity] = useState(() => readWebsiteHandoff(extension, 'payment'))
  const auth = useWebsiteAuthState()
  const [state, setState] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(Boolean(extension.apiBase && (identity.clientId || auth.user?.id)))
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [patreonLoading, setPatreonLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const effectiveClientId = identity.clientId || ''
      const effectiveAccountId = identity.accountId || auth.user?.id || ''
      const effectiveEmail = identity.email || auth.user?.email || ''
      if (!extension.apiBase || !effectiveClientId || !effectiveAccountId) {
        setLoading(false)
        return
      }

      try {
        const query = new URLSearchParams({ clientId: effectiveClientId, accountId: effectiveAccountId, appId: extension.appId })
        if (effectiveEmail) query.set('email', effectiveEmail)
        const res = await fetch(`${extension.apiBase}/api/billing/state?${query.toString()}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Payment state could not be loaded.')
        if (!cancelled) setState(data as BillingState)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Payment state could not be loaded.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [auth.user?.email, auth.user?.id, extension.apiBase, extension.appId, identity, paymentStatus])

  useEffect(() => {
    if (!paymentStatus || !extension.apiBase) return
    const pending = readPendingAction(WEBSITE_PATREON_PENDING_KEY)
    if (!pending || pending.slug !== extension.slug) return
    clearPendingAction(WEBSITE_PATREON_PENDING_KEY)
    void trackWebsiteEvent({
      extension,
      page: 'payment',
      eventName: paymentStatus === 'connected' ? 'Website Patreon Connect Completed' : 'Website Patreon Connect Failed',
      authUser: auth.user,
      identity,
      billingState: state,
      properties: {
        startedAt: pending.startedAt,
        callbackStatus: paymentStatus,
      },
    })
  }, [auth.user, extension, identity, paymentStatus, state])

  const isPatreonBilling = extension.billingProvider === 'patreon'
  const patreonLastSyncedLabel = state?.patreonLastSyncedAt ? new Date(state.patreonLastSyncedAt).toLocaleString() : null
  const effectiveClientId = identity.clientId || ''
  const effectiveAccountId = identity.accountId || auth.user?.id || ''
  const effectiveEmail = identity.email || auth.user?.email || ''
  const isSyncedUser = Boolean(auth.user && identity.accountId && auth.user.id === identity.accountId)
  const isDifferentUser = Boolean(auth.user && identity.accountId && auth.user.id !== identity.accountId)
  const planLabel = loading ? 'Checking...' : state?.plan === 'pro' ? 'Pro active' : 'Free plan'
  const patreonStatusLabel = state?.patreonConnected ? 'Linked' : 'Not linked'
  const canConnectPatreon = Boolean(auth.user && !isDifferentUser)

  const handleConnectPatreon = async () => {
    if (!extension.apiBase || !effectiveClientId || !effectiveAccountId) {
      setError('Sign in with the same Google account first so Patreon can be linked to the right extension account.')
      return
    }
    setError(null)
    setPatreonLoading(true)
    try {
      writePendingAction(WEBSITE_PATREON_PENDING_KEY, extension.slug)
      await trackWebsiteEvent({
        extension,
        page: 'payment',
        eventName: 'Website Patreon Connect Started',
        authUser: auth.user,
        identity,
        billingState: state,
        properties: {
          ctaOrigin: 'payment-primary',
        },
      })
      const query = new URLSearchParams({
        appId: extension.appId,
        clientId: effectiveClientId,
        accountId: effectiveAccountId,
      })
      if (effectiveEmail) query.set('email', effectiveEmail)
      const res = await fetch(`${extension.apiBase}/api/billing/patreon/connect?${query.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.connectUrl !== 'string') {
        throw new Error(data.error || 'Patreon link could not be started.')
      }
      window.location.href = data.connectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Patreon link could not be started.')
      setPatreonLoading(false)
    }
  }

  return (
      <section className="article-card payment-shell">
        <div className="payment-header">
          <div className="payment-header-copy">
            <h1>Upgrade to Deep Note Pro.</h1>
            <p>{extension.priceLabel || '$5 / month'} billed through Patreon. Sign in, link Patreon, and unlock Pro on the same Deep Note account.</p>
            <div className="payment-confidence-row">
              <span>Same Google account on extension and website</span>
              <span>Patreon handles billing</span>
              <span>Pro syncs back automatically</span>
            </div>
          </div>
          <div className="payment-price-card payment-price-card-preview">
            <span>Deep Note Pro</span>
            <strong>{extension.priceLabel || '$5 / month'}</strong>
            <p>AI summaries, smart organization, and knowledge chat across your saved notes.</p>
            <div className="payment-visual-tags">
              <span>Summaries</span>
              <span>Folders</span>
              <span>Knowledge chat</span>
            </div>
            <div className="payment-preview-stack">
              <div className="payment-preview-card">
                <div className="payment-preview-top">
                  <span className="mini-pill">Saved note</span>
                  <span className="example-note-color tone-mint" />
                </div>
                <strong>Article insight saved cleanly</strong>
                <p>Keep the key quote, add your own thought, and revisit it later with a generated summary.</p>
              </div>
              <div className="payment-preview-card payment-preview-card-secondary">
                <div className="section-label">With Pro</div>
                <ul className="simple-list feature-list">
                  <li>Ask across your saved notes</li>
                  <li>Sort faster with suggestions</li>
                  <li>Keep one account everywhere</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {paymentStatus === 'connected' ? <p className="success"><strong>Patreon connected.</strong> Your membership is now linked back to this extension account.</p> : null}
        {paymentStatus === 'failed' ? (
          <p className="warning">
            Patreon connection did not complete. You can retry from this page.
            {paymentReason ? <span className="inline-note">Reason: {paymentReason}</span> : null}
          </p>
        ) : null}
        <div className="two-col payment-layout">
          <div className="payment-column stack-md">
            <section className="payment-panel">
              <div className="section-label">Account</div>
              <p><strong>Website account:</strong> {auth.loading ? 'Checking...' : auth.user?.email || 'Not signed in'}</p>
              {auth.user ? (
                <div className={`sync-status-card ${isDifferentUser ? 'is-warning' : 'is-success'}`}>
                  <strong>{isDifferentUser ? 'Different account detected' : isSyncedUser ? 'Website and extension are synced' : 'Website session active'}</strong>
                  <p>
                    {isDifferentUser
                      ? `Website: ${auth.user.email || auth.user.id} | Extension: ${identity.email || identity.accountId}`
                      : auth.user.email || auth.user.id}
                  </p>
                </div>
              ) : null}
              {!auth.user ? <p className="muted-copy">Sign in first so the Patreon membership attaches to the correct Deep Note account.</p> : null}
              {!auth.user && auth.configured ? (
                <div className="auth-inline-box">
                  <p>Use the same Google account you use inside the extension before you continue to Patreon.</p>
                  <button
                    className="button-cta inline-cta"
                    onClick={() => {
                      setAuthError(null)
                      void startWebsiteGoogleSignIn(extension, 'payment-account').catch((err) => setAuthError(err instanceof Error ? err.message : 'Website sign-in failed.'))
                    }}
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : null}
              {auth.user ? (
                <div className="cta-row compact-cta-row">
                  <button
                    className="secondary-cta"
                    onClick={() => {
                      setAuthError(null)
                      void signOutOnWebsite().catch((err) => setAuthError(err instanceof Error ? err.message : 'Sign out failed.'))
                    }}
                  >
                    Sign out on website
                  </button>
                </div>
              ) : null}
              {!auth.configured ? <p className="warning">Supabase website auth is not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on this site.</p> : null}
              {authError ? <p className="warning">{authError}</p> : null}
            </section>

            <section className="payment-panel">
              <div className="section-label">Current access</div>
              {loading ? <p>Loading payment options...</p> : null}
              {error ? <p className="warning">{error}</p> : null}
              {state ? (
                <div className="payment-state-grid">
                  <div className="mini-detail-card">
                    <span>Plan</span>
                    <strong>{state.plan === 'pro' ? 'Pro' : 'Free'}</strong>
                  </div>
                  <div className="mini-detail-card">
                    <span>Access source</span>
                    <strong>{state.source}</strong>
                  </div>
                  <div className="mini-detail-card">
                    <span>Billing</span>
                    <strong>{state.billingProvider || 'website'}</strong>
                  </div>
                  <div className="mini-detail-card">
                    <span>Patreon</span>
                    <strong>{state.patreonConnected ? 'Linked' : 'Not linked'}</strong>
                  </div>
                </div>
              ) : null}
              {state?.source === 'promo' && state.trialEndsAt ? <p><strong>Promo ends:</strong> {new Date(state.trialEndsAt).toLocaleString()}</p> : null}
              {state?.isTrialActive && state.trialEndsAt ? <p><strong>Trial ends:</strong> {new Date(state.trialEndsAt).toLocaleString()}</p> : null}
              {patreonLastSyncedLabel ? <p><strong>Last Patreon sync:</strong> {patreonLastSyncedLabel}</p> : null}
            </section>
          </div>

          <div className="payment-column stack-md">
            <section className="payment-panel payment-panel-accent">
              <div className="section-label">Upgrade</div>
              <h2>{state?.patreonConnected ? 'Refresh your Pro access' : 'Link Patreon to unlock Pro'}</h2>
              <p className="payment-lead-copy">
                {state?.patreonConnected
                  ? 'This account is already linked. Refresh if your membership changed.'
                  : `Pro is ${extension.priceLabel || '$5 / month'}. Link Patreon once and this account comes back with Pro unlocked.`}
              </p>
              {isPatreonBilling ? <p className="muted-copy">Membership changes usually appear on the next sync window.</p> : null}
              {!canConnectPatreon ? (
                <div className="payment-checklist-card">
                  <strong>Before you continue</strong>
                  <ul className="simple-list feature-list">
                    <li>Sign in on the website with the same Google account you use in the extension.</li>
                    <li>Make sure the website and extension are using the same account before connecting Patreon.</li>
                  </ul>
                </div>
              ) : null}
              <ul className="payment-feature-list">
                <li>AI summaries and smart tags</li>
                <li>Folder suggestions and knowledge chat</li>
                <li>Same account across extension and website</li>
              </ul>
              <div className="cta-row">
                {isPatreonBilling ? (
                  <button className="button-cta payment-primary-cta" onClick={() => void handleConnectPatreon()} disabled={patreonLoading || !canConnectPatreon}>
                    {patreonLoading ? 'Opening Patreon...' : 'Link Patreon to Pro'}
                  </button>
                ) : null}
                {state?.billingProvider === 'website' && state?.checkoutUrl ? (
                  <a
                    className="secondary-cta"
                    href={state.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      void trackWebsiteEvent({
                        extension,
                        page: 'payment',
                        eventName: 'Website Checkout Opened',
                        authUser: auth.user,
                        identity,
                        billingState: state,
                      })
                    }}
                  >
                    Open checkout
                  </a>
                ) : null}
                {state?.portalUrl && state?.plan === 'pro' ? (
                  <a
                    className="secondary-cta"
                    href={state.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      void trackWebsiteEvent({
                        extension,
                        page: 'payment',
                        eventName: 'Website Billing Portal Opened',
                        authUser: auth.user,
                        identity,
                        billingState: state,
                      })
                    }}
                  >
                    {isPatreonBilling ? 'Open Patreon membership' : 'Open billing portal'}
                  </a>
                ) : null}
              </div>
              {!canConnectPatreon ? <p className="muted-copy">The button unlocks once the correct website account is signed in.</p> : null}
              <div className="payment-status-strip">
                <div>
                  <span>Current access</span>
                  <strong>{planLabel}</strong>
                </div>
                <div>
                  <span>Patreon</span>
                  <strong>{patreonStatusLabel}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="payment-footer-link">
          <a href={`/${extension.slug}`}>Back to {extension.name}</a>
        </div>
    </section>
  )
}

function ArticlePage({ extension, title, eyebrow, items }: { extension: ExtensionDefinition; title: string; eyebrow: string; items: PolicySection[] }) {
  return (
    <LegalDocument
      eyebrow={eyebrow}
      title={title}
      intro={`${extension.name} stays separate from the other extensions on this domain. This page applies only to ${extension.name} and its product-specific data flows, account handling, and billing behavior.`}
      items={items}
    />
  )
}

function SupportPage({ extension }: { extension: ExtensionDefinition }) {
  const [identity] = useState(() => readWebsiteHandoff(extension, 'login'))
  const auth = useWebsiteAuthState()
  const [category, setCategory] = useState('billing')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [replyEmail, setReplyEmail] = useState(identity.email || '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!replyEmail && auth.user?.email) {
      setReplyEmail(auth.user.email)
    }
  }, [auth.user?.email, replyEmail])

  const submit = async () => {
    const clientId = identity.clientId || identity.accountId || auth.user?.id || ''
    const accountId = identity.accountId || auth.user?.id || null
    const accountEmail = identity.email || auth.user?.email || null

    if (!extension.apiBase || !clientId) {
      setStatus('error')
      setStatusMessage('Sign in with the same Google account first so support can be tied to the right extension account.')
      return
    }

    if (!subject.trim() || !message.trim()) {
      setStatus('error')
      setStatusMessage('Add a subject and message before sending your support request.')
      return
    }

    setStatus('sending')
    setStatusMessage(null)
    try {
      const res = await fetch(`${extension.apiBase}/api/support/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: extension.appId,
          clientId,
          accountId,
          accountEmail,
          replyEmail: replyEmail.trim() || accountEmail,
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Support request could not be sent.')
      void trackWebsiteEvent({
        extension,
        page: 'support',
        eventName: 'Website Support Submitted',
        authUser: auth.user,
        identity,
        properties: { category },
      })
      setStatus('done')
      setStatusMessage('Support request sent. It is now visible in the admin workspace for this extension.')
      setSubject('')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Support request could not be sent.')
    }
  }

    return (
      <section className="article-card">
        <div className="pill">Support</div>
        <h1>{extension.name} support</h1>
        <p className="article-intro">{extension.supportBody}</p>
        <div className="stack-md">
          <section className="support-readiness-grid">
            <article className="support-readiness-card">
              <div className="section-label">Best for</div>
              <strong>Billing, login, and product issues</strong>
              <p>Use this route for install problems, billing questions, Patreon access issues, or product bugs.</p>
            </article>
            <article className="support-readiness-card">
              <div className="section-label">What to include</div>
              <strong>Enough context to reproduce it</strong>
              <p>Include the page you were on, what you clicked, what account you used, and what happened.</p>
            </article>
            <article className="support-readiness-card">
              <div className="section-label">Account matching</div>
              <strong>Same Google account helps</strong>
              <p>Using the same account as the extension makes support and billing checks easier.</p>
            </article>
          </section>
          <section className="content-panel compact-support-panel">
            <div className="section-label">Send a support request</div>
            <div className="stack-md support-form-stack">
              <p className="muted-copy">Use the same Google account you use in the extension when possible. That makes it easier to match your request to billing, login, and product activity for this extension only.</p>
            <div className="support-form-grid">
              <label className="field">
                <span>Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="billing">Billing or Patreon</option>
                  <option value="login">Login or account sync</option>
                  <option value="bug">Bug report</option>
                  <option value="feedback">Product feedback</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>Reply email</span>
                <input type="email" value={replyEmail} onChange={(event) => setReplyEmail(event.target.value)} placeholder="you@example.com" />
              </label>
            </div>
            <label className="field">
              <span>Subject</span>
              <input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={`What do you need help with in ${extension.name}?`} />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea className="support-textarea" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include what you were trying to do, what happened, and what account or browser context might help us reproduce it." />
            </label>
            <div className="cta-row">
              <button className="button-cta" onClick={() => void submit()} disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending...' : 'Send support request'}
              </button>
              <a className="secondary-cta" href={`/${extension.slug}/login`}>Login help</a>
              </div>
              {statusMessage ? <p className={status === 'done' ? 'success' : 'warning'}>{statusMessage}</p> : null}
            </div>
          </section>
          <div className="editorial-section">
            <div className="editorial-copy">
              <p>Use support for install issues, account sync problems, billing questions, and product-specific bugs.</p>
              <p>If you only need to reconnect your account or continue with payment, use the login or payment routes from this same product page.</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

function SharedNotePage({ extension, slug }: { extension: ExtensionDefinition; slug: string }) {
  const [note, setNote] = useState<SharedNote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!extension.apiBase) {
        setError('This product does not expose share pages yet.')
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${extension.apiBase}/api/share/${encodeURIComponent(slug)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Shared note could not be loaded.')
        if (!cancelled) setNote(data.note || null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Shared note could not be loaded.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [extension.apiBase, slug])

  if (loading) return <section className="article-card"><h1>Loading shared note...</h1></section>
  if (error || !note) return <section className="article-card"><h1>Shared note unavailable</h1><p className="article-intro">{error || 'The link may be invalid or expired.'}</p></section>

  return (
    <section className="shared-note-shell">
      <article className="shared-note-card">
        {note.imageUrl ? (
          <div className="shared-note-image-wrap">
            <img src={note.imageUrl} alt={note.title || 'Shared note image'} className="shared-note-image" />
            <div className="shared-note-image-pill">Image</div>
          </div>
        ) : null}

        <div className="shared-note-body">
          <div className="shared-note-topbar">
            <div className="shared-note-meta">
              <span className="pill">{extension.name} shared note</span>
              {note.isStarter ? <span className="mini-pill">Default</span> : null}
            </div>
            <span className="shared-note-date">{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Shared now'}</span>
          </div>

          {note.tags?.length ? (
            <div className="shared-note-tags">
              {note.tags.map((tag) => <span key={tag} className="shared-note-tag">{tag}</span>)}
            </div>
          ) : null}

          <h1>{note.title || 'Untitled note'}</h1>

          {note.summary ? (
            <p className="shared-note-summary">{note.summary}</p>
          ) : null}

          {note.text ? (
            <section
              className="shared-note-section shared-note-text"
              style={{ backgroundColor: note.highlightColor ? `${note.highlightColor}40` : undefined, borderColor: note.highlightColor || undefined }}
            >
              <div className="shared-note-section-label">Captured text</div>
              <p>"{note.text}"</p>
            </section>
          ) : null}

          {note.opinion ? (
            <section className="shared-note-section">
              <div className="shared-note-section-label accent-text">My thoughts</div>
              <p>{note.opinion}</p>
            </section>
          ) : null}

          <div className="shared-note-footer">
            {note.url ? <a className="secondary-cta inline-cta" href={note.url} target="_blank" rel="noreferrer">Source link</a> : <span />}
            <span className="muted-copy">Shared from Deep Note</span>
          </div>
        </div>
      </article>
    </section>
  )
}

function LeavePage({ extension }: { extension: ExtensionDefinition }) {
  const [identity] = useState(() => readWebsiteHandoff(extension, 'leave'))
  const clientId = identity.clientId
  const accountId = identity.accountId
  const accountEmail = identity.email
  const [reason, setReason] = useState<LeaveFeedbackReason>('too-noisy')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const reasons: Array<{ value: LeaveFeedbackReason; label: string }> = [
    { value: 'too-noisy', label: 'It felt distracting' },
    { value: 'missing-feature', label: 'It missed something I needed' },
    { value: 'too-buggy', label: 'It felt buggy' },
    { value: 'too-expensive', label: 'Pricing was the issue' },
    { value: 'using-something-else', label: 'I use another tool' },
    { value: 'temporary-break', label: 'Just taking a break' },
    { value: 'other', label: 'Something else' },
  ]

  const submit = async () => {
    if (!extension.apiBase || !clientId) {
      setStatus('error')
      setMessage('Connect an uninstall feedback endpoint for this extension to collect responses here.')
      return
    }
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch(`${extension.apiBase}/api/feedback/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, accountId: accountId || null, accountEmail: accountEmail || null, reason, details }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Feedback could not be sent.')
      setStatus('done')
      setMessage('Thanks. Your feedback was sent.')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Feedback could not be sent.')
    }
  }

  return (
    <section className="article-card compact-card">
      <div className="pill">Quick feedback</div>
      <h1>Why are you leaving {extension.name}?</h1>
      <p className="article-intro">A quick answer helps improve {extension.name} without turning this into a long exit survey.</p>
      {identity.email ? <p className="muted-copy">Signed-in account: {identity.email}</p> : null}
      <div className="reason-grid">
        {reasons.map((item) => (
          <button key={item.value} className={`reason-card ${reason === item.value ? 'is-selected' : ''}`} onClick={() => setReason(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <textarea className="feedback-box" rows={3} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Optional note" />
      <div className="cta-row">
        <button className="button-cta" disabled={status === 'sending' || status === 'done'} onClick={() => void submit()}>{status === 'sending' ? 'Sending...' : status === 'done' ? 'Sent' : 'Send'}</button>
        <a className="secondary-cta" href={`/${extension.slug}`}>Back</a>
      </div>
      {message ? <p className={status === 'error' ? 'warning' : 'success'}>{message}</p> : null}
    </section>
  )
}

function MetricGrid({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <section className="info-card">
      <div className="section-label">{title}</div>
      <div className="metric-grid">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="metric-card">
            <strong>{value}</strong>
            <span>{key}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function AdminPage() {
  const [selectedSlug, setSelectedSlug] = useState<ExtensionSlug>('deep-note')
  const [passcode, setPasscode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [datePreset, setDatePreset] = useState<AdminDatePreset>('today')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null)
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null)

  useEffect(() => {
    const storedPasscode = localStorage.getItem('admin-passcode')
    const storedAuth = localStorage.getItem('admin-authenticated')
    if (storedPasscode) setPasscode(storedPasscode)
    if (storedAuth === 'true') setIsAuthenticated(true)
  }, [])

  const extension = extensionMap.get(selectedSlug) || extensions[0]
  const selectedAppId = extension.adminAnalyticsAppId || extension.appId
  const dateRange = useMemo(() => getDatePresetRange(datePreset, customDate), [datePreset, customDate])
  const supportsSubscriptionActions = Boolean(extension.adminApiBase && extension.adminSubscriptionPath)

  useEffect(() => {
    setData(null)
    setError(null)
    setActionStatus(null)
    setSelectedUserKey(null)
  }, [selectedSlug])

  useEffect(() => {
    if (!isAuthenticated || data || loading) return
    void loadAnalytics()
  }, [isAuthenticated, selectedSlug])

  const loadAnalytics = async (authenticateOnly = false) => {
    if (!extension.adminApiBase || !extension.adminAnalyticsPath) {
      setError('This extension does not have an admin analytics endpoint configured yet.')
      setData(null)
      return
    }
    if (!passcode.trim()) {
      setError('Enter the admin passcode first.')
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams()
      if (selectedAppId) query.set('appId', selectedAppId)
      const endpoint = `${extension.adminApiBase}${extension.adminAnalyticsPath}${query.toString() ? `?${query.toString()}` : ''}`
      const res = await fetch(endpoint, {
        headers: {
          'x-admin-passcode': passcode.trim(),
          'x-extension-app-id': selectedAppId,
        },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Admin analytics could not be loaded.')
      setIsAuthenticated(true)
      localStorage.setItem('admin-authenticated', 'true')
      localStorage.setItem('admin-passcode', passcode.trim())
      if (!authenticateOnly) {
        setData(payload as AdminAnalyticsResponse)
      }
    } catch (err) {
      setIsAuthenticated(false)
      localStorage.removeItem('admin-authenticated')
      setError(err instanceof Error ? err.message : 'Admin analytics could not be loaded.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthenticate = async () => {
    setData(null)
    await loadAnalytics()
  }

  const handleSignOut = () => {
    setIsAuthenticated(false)
    setData(null)
    setError(null)
    setActionStatus(null)
    localStorage.removeItem('admin-authenticated')
    localStorage.removeItem('admin-passcode')
  }

  const isWithinRange = (timestamp?: number | null) => {
    if (!timestamp) return false
    if (!dateRange.start || !dateRange.end) return true
    const value = new Date(timestamp).toISOString().split('T')[0]
    return value >= dateRange.start && value <= dateRange.end
  }

  const filteredRecentEvents = useMemo(() => {
    const events = data?.recentEvents || []
    return events.filter((event) => {
      const matchesApp = !event.appId || event.appId === selectedAppId
      return matchesApp && isWithinRange(event.timestamp)
    })
  }, [data?.recentEvents, dateRange.end, dateRange.start, selectedAppId])

  const filteredUninstallFeedback = useMemo(() => {
    const items = data?.uninstallFeedback || []
    return items.filter((item) => {
      const matchesApp = !item.appId || item.appId === selectedAppId
      return matchesApp && isWithinRange(item.createdAt)
    })
  }, [data?.uninstallFeedback, dateRange.end, dateRange.start, selectedAppId])

  const filteredSupportRequests = useMemo(() => {
    const items = data?.supportRequests || []
    return items.filter((item) => {
      const matchesApp = !item.appId || item.appId === selectedAppId
      return matchesApp && isWithinRange(item.timestamp)
    })
  }, [data?.supportRequests, dateRange.end, dateRange.start, selectedAppId])

  const derivedTopScreens = useMemo(() => {
    const counts = new Map<string, number>()
    filteredRecentEvents.forEach((event) => {
      const screen = typeof event.properties?.screen === 'string' ? event.properties.screen : 'unknown'
      counts.set(screen, (counts.get(screen) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([screen, count]) => ({ screen, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [filteredRecentEvents])

  const derivedTopEvents = useMemo(() => {
    const counts = new Map<string, number>()
    filteredRecentEvents.forEach((event) => {
      counts.set(event.eventName, (counts.get(event.eventName) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [filteredRecentEvents])

  const websiteEvents = useMemo(
    () => filteredRecentEvents.filter((event) => typeof event.properties?.screen === 'string' && String(event.properties.screen).startsWith('website-')),
    [filteredRecentEvents],
  )

  const websitePageViews = useMemo(() => {
    const counts = new Map<string, number>()
    websiteEvents.forEach((event) => {
      if (!event.eventName.endsWith('Viewed')) return
      const pageKey = typeof event.properties?.pageKey === 'string' ? event.properties.pageKey : 'other'
      counts.set(pageKey, (counts.get(pageKey) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
  }, [websiteEvents])

  const websiteVisitSources = useMemo(() => {
    const counts = new Map<string, number>()
    websiteEvents.forEach((event) => {
      if (!event.eventName.endsWith('Viewed')) return
      const source = typeof event.properties?.visitSource === 'string' ? event.properties.visitSource : 'direct'
      counts.set(source, (counts.get(source) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [websiteEvents])

  const websiteConversionSteps = useMemo(() => {
    const sets = {
      visitors: new Set<string>(),
      pricing: new Set<string>(),
      payment: new Set<string>(),
      signIn: new Set<string>(),
      patreon: new Set<string>(),
      pro: new Set<string>(),
    }

    websiteEvents.forEach((event) => {
      const key = buildUserKey(event.accountId, event.clientId)
      if (event.eventName === 'Website Product Viewed') sets.visitors.add(key)
      if (event.eventName === 'Website Pricing Viewed' || event.eventName === 'Website Upgrade Opened') sets.pricing.add(key)
      if (event.eventName === 'Website Payment Viewed') sets.payment.add(key)
      if (event.eventName === 'Website Sign In Completed') sets.signIn.add(key)
      if (event.eventName === 'Website Patreon Connect Completed') sets.patreon.add(key)
      if (event.plan === 'pro' || event.subscriptionKind === 'pro') sets.pro.add(key)
    })

    const base = sets.visitors.size || 0
    return [
      { key: 'visitors', label: 'Product visitors', count: sets.visitors.size, rate: '100%' },
      { key: 'pricing', label: 'Upgrade interest', count: sets.pricing.size, rate: formatPercent(sets.pricing.size, base) },
      { key: 'payment', label: 'Payment visits', count: sets.payment.size, rate: formatPercent(sets.payment.size, base) },
      { key: 'signIn', label: 'Signed in on web', count: sets.signIn.size, rate: formatPercent(sets.signIn.size, base) },
      { key: 'patreon', label: 'Patreon linked', count: sets.patreon.size, rate: formatPercent(sets.patreon.size, base) },
      { key: 'pro', label: 'Pro identified', count: sets.pro.size, rate: formatPercent(sets.pro.size, base) },
    ]
  }, [websiteEvents])

  const websiteOverviewCards = useMemo(() => {
    const totalViews = websitePageViews.reduce((sum, item) => sum + item.count, 0)
    const uniqueVisitors = new Set(websiteEvents.filter((event) => event.eventName.endsWith('Viewed')).map((event) => buildUserKey(event.accountId, event.clientId))).size
    const pricingCount = websitePageViews.find((item) => item.page === 'pricing')?.count || 0
    const paymentCount = websitePageViews.find((item) => item.page === 'payment')?.count || 0
    const signInCount = websiteConversionSteps.find((item) => item.key === 'signIn')?.count || 0
    const patreonCount = websiteConversionSteps.find((item) => item.key === 'patreon')?.count || 0

    return [
      { label: 'Website visits', value: totalViews, tone: 'default' },
      { label: 'Unique visitors', value: uniqueVisitors, tone: 'default' },
      { label: 'Pricing visits', value: pricingCount, tone: 'support' },
      { label: 'Payment visits', value: paymentCount, tone: 'support' },
      { label: 'Website sign-ins', value: signInCount, tone: 'accent' },
      { label: 'Patreon links', value: patreonCount, tone: 'warm' },
    ]
  }, [websiteConversionSteps, websiteEvents, websitePageViews])

  const journeyRows = useMemo<AdminJourney[]>(() => {
    const grouped = new Map<string, AdminJourney>()
    filteredRecentEvents
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((event) => {
        const userKey = buildUserKey(event.accountId, event.clientId)
        const existing = grouped.get(userKey)
        const screen = typeof event.properties?.screen === 'string' ? event.properties.screen : ''
        if (!existing) {
          grouped.set(userKey, {
            userKey,
            label: getUserLabel(event),
            totalEvents: 1,
            firstSeen: event.timestamp,
            lastSeen: event.timestamp,
            path: [event.eventName],
            screens: screen ? [screen] : [],
          })
          return
        }

        existing.totalEvents += 1
        existing.lastSeen = event.timestamp
        if (existing.path[existing.path.length - 1] !== event.eventName) {
          existing.path.push(event.eventName)
        }
        if (screen && existing.screens[existing.screens.length - 1] !== screen) {
          existing.screens.push(screen)
        }
      })

    return Array.from(grouped.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 12)
  }, [filteredRecentEvents])

  const derivedUsers = useMemo<AdminUserSummary[]>(() => {
    const byKey = new Map<string, AdminUserSummary>()
    const clientAccountMap = new Map<string, string>()

    data?.users?.forEach((user) => {
      const key = buildUserKey(user.accountId, user.clientId)
      user.linkedClientIds?.forEach((clientId) => {
        if (user.accountId) {
          clientAccountMap.set(clientId, user.accountId)
        }
      })
      byKey.set(key, {
        userKey: key,
        label: getUserLabel(user),
        clientId: user.clientId || null,
        accountId: user.accountId || null,
        accountEmail: user.accountEmail || null,
        billingOverride: user.billingOverride ?? null,
        totalEvents: user.totalEvents,
        firstSeen: user.firstSeenAt,
        lastSeen: user.lastSeenAt,
        activeDays: user.activeDays,
        currentPlan: user.currentPlan,
        subscriptionKind: user.subscriptionKind,
        lastEventName: user.lastEventName || null,
        linkedClientIds: user.linkedClientIds || [],
        aiRequests: user.aiUsage?.total ?? user.aiUsage?.totalRequests ?? 0,
        trialEndsAt: user.trialEndsAt ?? null,
        promoCodeApplied: user.promoCodeApplied ?? null,
      })
    })

    filteredRecentEvents.forEach((event) => {
      const resolvedAccountId = event.accountId || (event.clientId ? clientAccountMap.get(event.clientId) : null)
      const key = buildUserKey(resolvedAccountId, event.clientId)
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, {
          userKey: key,
          label: getUserLabel({ ...event, accountId: resolvedAccountId }),
          clientId: event.clientId || null,
          accountId: resolvedAccountId || null,
          accountEmail: event.accountEmail || null,
          billingOverride: null,
          totalEvents: 1,
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          activeDays: 1,
          currentPlan: 'basic',
          subscriptionKind: 'basic',
          lastEventName: event.eventName,
          linkedClientIds: event.clientId ? [event.clientId] : [],
          aiRequests: 0,
          trialEndsAt: null,
          promoCodeApplied: null,
        })
        return
      }

      existing.totalEvents += 1
      existing.firstSeen = Math.min(existing.firstSeen, event.timestamp)
      existing.lastSeen = Math.max(existing.lastSeen, event.timestamp)
      existing.lastEventName = event.eventName
      if (event.clientId && !existing.linkedClientIds.includes(event.clientId)) {
        existing.linkedClientIds.push(event.clientId)
      }
    })

    filteredSupportRequests.forEach((request) => {
      const key = buildUserKey(request.accountId, request.clientId)
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, {
          userKey: key,
          label: getUserLabel(request),
          clientId: request.clientId || null,
          accountId: request.accountId || null,
          accountEmail: request.accountEmail || request.replyEmail || null,
          billingOverride: null,
          totalEvents: 0,
          firstSeen: request.timestamp,
          lastSeen: request.timestamp,
          activeDays: 1,
          currentPlan: 'basic',
          subscriptionKind: 'basic',
          lastEventName: `Support: ${request.subject}`,
          linkedClientIds: request.clientId ? [request.clientId] : [],
          aiRequests: 0,
          trialEndsAt: null,
          promoCodeApplied: null,
        })
        return
      }

      existing.firstSeen = Math.min(existing.firstSeen, request.timestamp)
      existing.lastSeen = Math.max(existing.lastSeen, request.timestamp)
      if (!existing.accountEmail && (request.accountEmail || request.replyEmail)) {
        existing.accountEmail = request.accountEmail || request.replyEmail || null
      }
      if (request.clientId && !existing.linkedClientIds.includes(request.clientId)) {
        existing.linkedClientIds.push(request.clientId)
      }
    })

    return Array.from(byKey.values()).sort((a, b) => b.lastSeen - a.lastSeen)
  }, [data?.users, filteredRecentEvents, filteredSupportRequests])

  useEffect(() => {
    if (!derivedUsers.length) {
      setSelectedUserKey(null)
      return
    }

    if (!selectedUserKey || !derivedUsers.some((user) => user.userKey === selectedUserKey)) {
      setSelectedUserKey(derivedUsers[0].userKey)
    }
  }, [derivedUsers, selectedUserKey])

  const selectedUser = useMemo(
    () => derivedUsers.find((user) => user.userKey === selectedUserKey) || null,
    [derivedUsers, selectedUserKey],
  )

  const selectedJourney = useMemo(
    () => (selectedUser ? journeyRows.find((journey) => journey.userKey === selectedUser.userKey) || null : null),
    [journeyRows, selectedUser],
  )

  const selectedUserEvents = useMemo(() => {
    if (!selectedUser) return filteredRecentEvents.slice().sort((a, b) => b.timestamp - a.timestamp)
    const linkedClients = new Set(selectedUser.linkedClientIds || [])
    return filteredRecentEvents
      .filter((event) => {
        if (selectedUser.accountId && event.accountId && event.accountId === selectedUser.accountId) return true
        if (event.clientId && linkedClients.has(event.clientId)) return true
        return buildUserKey(event.accountId, event.clientId) === selectedUser.userKey
      })
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [filteredRecentEvents, selectedUser])

  const selectedUserTimeline = useMemo(() => {
    if (!selectedUserEvents.length) return []
    return selectedUserEvents
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-30)
  }, [selectedUserEvents])

  const selectedUserFeedback = useMemo(() => {
    if (!selectedUser) return filteredUninstallFeedback
    return filteredUninstallFeedback.filter((item) => {
      if (selectedUser.accountId && item.accountId && item.accountId === selectedUser.accountId) return true
      if (selectedUser.clientId && item.clientId && item.clientId === selectedUser.clientId) return true
      if (selectedUser.accountEmail && item.accountEmail && item.accountEmail === selectedUser.accountEmail) return true
      return false
    })
  }, [filteredUninstallFeedback, selectedUser])

  const selectedUserSupportRequests = useMemo(() => {
    if (!selectedUser) return filteredSupportRequests
    return filteredSupportRequests.filter((item) => {
      if (selectedUser.accountId && item.accountId && item.accountId === selectedUser.accountId) return true
      if (selectedUser.clientId && item.clientId && item.clientId === selectedUser.clientId) return true
      if (selectedUser.accountEmail && item.accountEmail && item.accountEmail === selectedUser.accountEmail) return true
      if (selectedUser.accountEmail && item.replyEmail && item.replyEmail === selectedUser.accountEmail) return true
      return false
    })
  }, [filteredSupportRequests, selectedUser])

  const derivedFunnel = useMemo(() => {
    if (data?.funnels && Object.keys(data.funnels).length) {
      return Object.entries(data.funnels).map(([key, count], index, items) => ({
        key,
        label: formatMetricLabel(key),
        count,
        rate: index === 0 ? '100%' : formatPercent(count, items[0]?.[1] || 0),
      }))
    }

    const uniqueUsers = new Set<string>()
    const openedDashboard = new Set<string>()
    const savedNotes = new Set<string>()
    const engagedUsers = new Set<string>()
    const checkoutUsers = new Set<string>()

    filteredRecentEvents.forEach((event) => {
      const userKey = buildUserKey(event.accountId, event.clientId)
      uniqueUsers.add(userKey)
      if (['Dashboard Opened', 'Opened Dashboard'].includes(event.eventName)) openedDashboard.add(userKey)
      if (event.eventName.toLowerCase().includes('save')) savedNotes.add(userKey)
      if (['Opened Checkout', 'Opened Billing Portal', 'Opened Knowledge Chat', 'Generated Share Link'].includes(event.eventName)) engagedUsers.add(userKey)
      if (event.eventName === 'Opened Checkout') checkoutUsers.add(userKey)
    })

    const firstStep = uniqueUsers.size
    return [
      { key: 'activeUsers', label: 'Active Users', count: firstStep, rate: '100%' },
      { key: 'openedDashboardUsers', label: 'Opened Dashboard', count: openedDashboard.size, rate: formatPercent(openedDashboard.size, firstStep) },
      { key: 'savedNoteUsers', label: 'Saved Notes', count: savedNotes.size, rate: formatPercent(savedNotes.size, firstStep) },
      { key: 'engagedUsers', label: 'Engaged Users', count: engagedUsers.size, rate: formatPercent(engagedUsers.size, firstStep) },
      { key: 'checkoutUsers', label: 'Checkout Intent', count: checkoutUsers.size, rate: formatPercent(checkoutUsers.size, firstStep) },
    ]
  }, [data?.funnels, filteredRecentEvents])

  const [funnelView, setFunnelView] = useState<'full' | 'activation' | 'monetization'>('full')

  const filteredFunnel = useMemo(() => {
    if (funnelView === 'activation') {
      return derivedFunnel.filter((step) => ['openedDashboardUsers', 'savedNoteUsers', 'engagedUsers'].includes(step.key))
    }
    if (funnelView === 'monetization') {
      return derivedFunnel.filter((step) => ['trialUsers', 'checkoutUsers', 'paidUsers'].includes(step.key))
    }
    return derivedFunnel
  }, [derivedFunnel, funnelView])

  const [adminSection, setAdminSection] = useState<'overview' | 'users' | 'funnel' | 'website' | 'events'>('overview')

  const overviewCards = useMemo(() => {
    const summary = data?.summary || {}
    const aiUsageTotal = Object.entries(data?.aiUsage || {}).reduce((total, [key, value]) => {
      if (key === 'activeUsers') return total
      return total + (typeof value === 'number' ? value : 0)
    }, 0)

    return [
      { label: 'Tracked Users', value: summary.totalUsers ?? derivedUsers.length, tone: 'default' },
      { label: 'Events in Range', value: filteredRecentEvents.length, tone: 'default' },
      { label: 'Pro / Trial / Promo', value: (summary.proUsers || 0) + (summary.trialUsers || 0) + (summary.promoUsers || 0), tone: 'accent' },
      { label: 'Checkout Intent', value: derivedFunnel.find((item) => item.key === 'checkoutUsers')?.count || 0, tone: 'warm' },
      { label: 'AI Requests', value: summary.totalAiRequests ?? aiUsageTotal, tone: 'default' },
      { label: 'Support Requests', value: filteredSupportRequests.length, tone: 'warm' },
      { label: 'Uninstall Signals', value: filteredUninstallFeedback.length, tone: 'danger' },
    ]
  }, [data?.aiUsage, data?.summary, derivedFunnel, derivedUsers.length, filteredRecentEvents.length, filteredSupportRequests.length, filteredUninstallFeedback.length])

  const activityBars = useMemo(() => {
    if (datePreset === 'all') return []

    const labels: string[] = []
    if (dateRange.start && dateRange.end) {
      const cursor = new Date(`${dateRange.start}T00:00:00`)
      const end = new Date(`${dateRange.end}T00:00:00`)
      while (cursor <= end) {
        labels.push(getLocalDateLabel(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    const eventCounts = new Map<string, number>()
    const newUserCounts = new Map<string, number>()

    filteredRecentEvents.forEach((event) => {
      const key = new Date(event.timestamp).toISOString().split('T')[0]
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1)
    })

    derivedUsers.forEach((user) => {
      const key = new Date(user.firstSeen).toISOString().split('T')[0]
      if (labels.includes(key)) {
        newUserCounts.set(key, (newUserCounts.get(key) || 0) + 1)
      }
    })

    const maxEvents = Math.max(1, ...labels.map((label) => eventCounts.get(label) || 0))
    const maxNewUsers = Math.max(1, ...labels.map((label) => newUserCounts.get(label) || 0))

    return labels.map((label) => ({
      label,
      shortLabel: formatShortDateLabel(label),
      eventCount: eventCounts.get(label) || 0,
      newUsers: newUserCounts.get(label) || 0,
      eventHeight: Math.max(10, Math.round(((eventCounts.get(label) || 0) / maxEvents) * 100)),
      userHeight: Math.max(10, Math.round(((newUserCounts.get(label) || 0) / maxNewUsers) * 100)),
    }))
  }, [datePreset, dateRange.end, dateRange.start, derivedUsers, filteredRecentEvents])

  const newUsersInRange = useMemo(() => {
    if (datePreset === 'all') return derivedUsers.length
    return derivedUsers.filter((user) => isWithinRange(user.firstSeen)).length
  }, [datePreset, derivedUsers, dateRange.end, dateRange.start])

  const runSubscriptionAction = async (action: 'grant_pro' | 'revoke_pro' | 'refresh_patreon' | 'lock_basic' | 'clear_override') => {
    if (!supportsSubscriptionActions || !selectedUser || !extension.adminApiBase || !extension.adminSubscriptionPath) {
      setActionStatus('This extension does not expose admin subscription actions yet.')
      return
    }
    if (!passcode.trim()) {
      setActionStatus('Enter the admin password again before running this action.')
      return
    }
    if (!selectedUser.accountId && !selectedUser.clientId) {
      setActionStatus('Pick a user with an account or client id first.')
      return
    }

    setActionLoading(true)
    setActionStatus(null)

    try {
      const res = await fetch(`${extension.adminApiBase}${extension.adminSubscriptionPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode.trim(),
        },
        body: JSON.stringify({
          clientId: selectedUser.accountId ? null : selectedUser.clientId,
          accountId: selectedUser.accountId,
          action,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Admin action failed.')
      if (action === 'refresh_patreon') {
        setActionStatus('Patreon status refreshed for the selected user.')
      } else if (action === 'lock_basic') {
        setActionStatus('Billing locked to Free for the selected user.')
      } else if (action === 'clear_override') {
        setActionStatus('Billing override removed for the selected user.')
      } else {
        setActionStatus(action === 'grant_pro' ? 'Pro granted for the selected user.' : 'Pro removed for the selected user.')
      }
      await loadAnalytics()
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Admin action failed.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
      <div className="stack-lg">
        <section className="hero-card admin-hero-card">
          <div className="pill">Admin analytics</div>
        <h1>{isAuthenticated ? 'Extension analytics workspace' : 'Admin sign in'}</h1>
        <p>{isAuthenticated ? 'Track user journeys, billing state, support, and churn in a cleaner desktop workspace.' : 'Enter the admin password to unlock the analytics workspace for your extensions.'}</p>
        </section>
      {!isAuthenticated ? (
        <section className="two-col">
          <div className="info-card">
            <div className="section-label">Enter password</div>
            <div className="stack-md">
              <label className="field">
                <span>Admin password</span>
                <input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Enter password" />
              </label>
              <button className="button-cta inline-cta" onClick={() => void handleAuthenticate()} disabled={loading}>
                {loading ? 'Checking...' : 'Sign in'}
              </button>
              {error ? <p className="warning">{error}</p> : null}
            </div>
          </div>
          <div className="info-card accent-card">
            <div className="section-label accent-text">Private route</div>
            <div className="stack-sm">
              <p>This page is intentionally URL-only and stays outside the public website navigation.</p>
              <p>Analytics remain separated by extension app id even after sign-in.</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="admin-layout">
            <aside className="admin-sidebar info-card">
              <div className="section-label">Workspace controls</div>
              <div className="stack-md">
                <label className="field">
                  <span>Extension</span>
                  <select value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value as ExtensionSlug)}>
                    {extensions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                  </select>
                </label>
                <div className="field">
                  <span>Date range</span>
                  <div className="preset-grid">
                    {[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'last7', label: 'Last 7 Days' },
                      { value: 'last30', label: 'Last 30 Days' },
                      { value: 'custom', label: 'Custom' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={`preset-chip ${datePreset === option.value ? 'is-active' : ''}`}
                        onClick={() => setDatePreset(option.value as AdminDatePreset)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {datePreset === 'custom' ? (
                  <label className="field">
                    <span>Select custom date</span>
                    <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
                  </label>
                ) : null}
                <div className="info-inline-card">
                  <strong>Viewing:</strong>
                  <span>{dateRange.label}</span>
                </div>
                <div className="info-inline-card">
                  <strong>App ID:</strong>
                  <span>{selectedAppId}</span>
                </div>
                <div className="cta-row">
                  <button className="button-cta inline-cta" onClick={() => void loadAnalytics()} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh workspace'}
                  </button>
                  <button className="secondary-cta" onClick={handleSignOut}>Sign out</button>
                </div>
                <p className="muted-copy">
                  {extension.adminApiBase && extension.adminAnalyticsPath
                    ? `This extension is wired to ${extension.adminAnalyticsPath} and filtered with app id ${selectedAppId}.`
                    : 'This extension still needs its own analytics endpoint config.'}
                </p>
                {data?.promoCodes?.length ? (
                  <div className="stack-sm">
                    <span className="field-label-inline">Promo codes</span>
                    <div className="journey-path">
                      {data.promoCodes.slice(0, 6).map((code) => <span key={code} className="journey-pill">{code}</span>)}
                    </div>
                  </div>
                ) : null}
                {error ? <p className="warning">{error}</p> : null}
              </div>
            </aside>
            <div className="admin-main stack-lg">
              <section className="admin-lead-card">
                <div>
                  <div className="section-label accent-text">Executive view</div>
                  <h2>{extension.name}</h2>
                  <p>Start with users, then scan activity, conversion, support, and churn without mixing extensions together.</p>
                </div>
                <div className="admin-lead-meta">
                  <div className="admin-mini-stat">
                    <span>Tracked range</span>
                    <strong>{dateRange.label}</strong>
                  </div>
                  <div className="admin-mini-stat">
                    <span>Selected extension</span>
                    <strong>{extension.name}</strong>
                  </div>
                  <div className="admin-mini-stat">
                    <span>Isolated app id</span>
                    <strong>{selectedAppId}</strong>
                  </div>
                </div>
              </section>

              <div className="admin-section-tabs">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'users', label: 'Users' },
                  { key: 'funnel', label: 'Funnel' },
                  { key: 'website', label: 'Website' },
                  { key: 'events', label: 'Events' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`admin-section-tab ${adminSection === tab.key ? 'is-active' : ''}`}
                    onClick={() => setAdminSection(tab.key as typeof adminSection)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {adminSection === 'overview' ? (
                <>
                  <section className="admin-visual-grid">
                    <section className="info-card compact-info-card">
                      <div className="section-label">New users</div>
                      <div className="visual-stat-row">
                        <div>
                          <strong className="visual-stat-value">{newUsersInRange}</strong>
                          <p className="muted-copy">First-time users in {dateRange.label}.</p>
                        </div>
                        <div className="mini-kpi-pill">users</div>
                      </div>
                      {activityBars.length ? (
                        <div className="mini-chart-grid">
                          {activityBars.slice(-10).map((bar) => (
                            <div key={`users-${bar.label}`} className="mini-chart-col" title={`${bar.shortLabel}: ${bar.newUsers} new users`}>
                              <span className="mini-chart-value">{bar.newUsers}</span>
                              <div className="mini-chart-track">
                                <div className="mini-chart-fill tone-users" style={{ height: `${bar.userHeight}%` }} />
                              </div>
                              <span>{bar.shortLabel}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted-copy">Switch from all-time to a preset range to see daily new-user movement.</p>
                      )}
                    </section>
                    <section className="info-card compact-info-card">
                      <div className="section-label">Event activity</div>
                      <div className="visual-stat-row">
                        <div>
                          <strong className="visual-stat-value">{filteredRecentEvents.length}</strong>
                          <p className="muted-copy">Tracked events for the current range.</p>
                        </div>
                        <div className="mini-kpi-pill tone-accent">events</div>
                      </div>
                      {activityBars.length ? (
                        <div className="mini-chart-grid">
                          {activityBars.slice(-10).map((bar) => (
                            <div key={`events-${bar.label}`} className="mini-chart-col" title={`${bar.shortLabel}: ${bar.eventCount} events`}>
                              <span className="mini-chart-value">{bar.eventCount}</span>
                              <div className="mini-chart-track">
                                <div className="mini-chart-fill tone-events" style={{ height: `${bar.eventHeight}%` }} />
                              </div>
                              <span>{bar.shortLabel}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted-copy">Switch from all-time to a preset range to see event volume over time.</p>
                      )}
                    </section>
                    <section className="info-card compact-info-card">
                      <div className="section-label">Current focus</div>
                      <div className="focus-stack">
                        <div className="focus-row">
                          <span>Selected user</span>
                          <strong>{selectedUser?.label || 'All users'}</strong>
                        </div>
                        <div className="focus-row">
                          <span>Support tickets</span>
                          <strong>{selectedUser ? selectedUserSupportRequests.length : filteredSupportRequests.length}</strong>
                        </div>
                        <div className="focus-row">
                          <span>Uninstall signals</span>
                          <strong>{selectedUser ? selectedUserFeedback.length : filteredUninstallFeedback.length}</strong>
                        </div>
                        <div className="focus-row">
                          <span>Checkout intent</span>
                          <strong>{derivedFunnel.find((item) => item.key === 'checkoutUsers')?.count || 0}</strong>
                        </div>
                      </div>
                    </section>
                  </section>
                  <section className="admin-overview-grid">
                    {overviewCards.map((card) => (
                      <div key={card.label} className={`overview-card tone-${card.tone}`}>
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                      </div>
                    ))}
                  </section>
                </>
              ) : null}

              {adminSection === 'users' ? (
                <section className="admin-user-workspace admin-user-workspace-priority">
                  <section className="info-card">
                    <div className="section-label">Users</div>
                    <p className="muted-copy">Google-linked users should appear here with email, user id, client id, plan state, and recent activity.</p>
                    <div className="user-list">
                      {derivedUsers.map((user) => (
                        <button
                          key={user.userKey}
                          className={`user-row-card ${selectedUser?.userKey === user.userKey ? 'is-active' : ''}`}
                          onClick={() => setSelectedUserKey(user.userKey)}
                        >
                          <div className="user-row-head">
                            <strong>{user.label}</strong>
                            <span>{user.totalEvents} events</span>
                          </div>
                          <div className="user-row-meta">
                            <span>{user.accountEmail || user.accountId || user.clientId || 'No id yet'}</span>
                            <span>{user.currentPlan} / {user.subscriptionKind}</span>
                          </div>
                          <div className="user-row-foot">
                            <span>Last seen {new Date(user.lastSeen).toLocaleString()}</span>
                            <span>{user.activeDays} active days</span>
                          </div>
                        </button>
                      ))}
                      {!derivedUsers.length ? <p className="muted-copy">No users found yet. Once sign-in and product events start, the list will populate here first.</p> : null}
                    </div>
                  </section>
                  <section className="info-card">
                    <div className="section-label">Selected user</div>
                    {selectedUser ? (
                      <div className="stack-md">
                        <div className="selected-user-hero">
                          <div>
                            <h3>{selectedUser.label}</h3>
                            <p>{selectedUser.accountEmail || selectedUser.accountId || selectedUser.clientId || 'Anonymous identity'}</p>
                          </div>
                          <div className={`admin-plan-badge tone-${selectedUser.currentPlan === 'pro' || selectedUser.subscriptionKind !== 'basic' ? 'accent' : 'default'}`}>
                            {selectedUser.currentPlan} / {selectedUser.subscriptionKind}
                          </div>
                        </div>
                        <div className="selected-user-grid">
                          <div className="mini-detail-card">
                            <span>User ID</span>
                            <strong>{selectedUser.accountId || 'No account id yet'}</strong>
                          </div>
                          <div className="mini-detail-card">
                            <span>Client ID</span>
                            <strong>{selectedUser.clientId || 'No client id'}</strong>
                          </div>
                          <div className="mini-detail-card">
                            <span>Last event</span>
                            <strong>{selectedUser.lastEventName || 'No recent event'}</strong>
                          </div>
                          <div className="mini-detail-card">
                            <span>AI requests</span>
                            <strong>{selectedUser.aiRequests}</strong>
                          </div>
                        </div>
                        {selectedJourney ? (
                          <div className="mini-detail-card">
                            <span>Journey snapshot</span>
                            <strong>{selectedJourney.path.slice(0, 4).join(' -> ')}</strong>
                          </div>
                        ) : null}
                        {selectedUserTimeline.length ? (
                          <div className="mini-detail-card">
                            <span>Detailed journey</span>
                            <div className="journey-timeline">
                              {selectedUserTimeline.map((event) => (
                                <div key={`${event.eventName}-${event.timestamp}`} className="journey-timeline-row">
                                  <div>
                                    <strong>{event.eventName}</strong>
                                    {event.properties?.screen ? <span>{String(event.properties.screen)}</span> : null}
                                  </div>
                                  <small>{new Date(event.timestamp).toLocaleString()}</small>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {supportsSubscriptionActions ? (
                          <div className="admin-action-panel">
                            <div>
                              <div className="section-label">Quick actions</div>
                              <p className="muted-copy">Grant or revoke Pro using the selected Google-linked account or client identity.</p>
                              {selectedUser.billingOverride === 'force_basic' ? (
                                <p className="muted-copy">Billing is locked to Free for this user.</p>
                              ) : null}
                            </div>
                            <div className="cta-row">
                              <button className="button-cta inline-cta" onClick={() => void runSubscriptionAction('grant_pro')} disabled={actionLoading}>
                                {actionLoading ? 'Working...' : 'Grant Pro'}
                              </button>
                              <button className="secondary-cta" onClick={() => void runSubscriptionAction('revoke_pro')} disabled={actionLoading}>
                                Revoke Pro
                              </button>
                            </div>
                            <div className="cta-row">
                              <button
                                className="secondary-cta"
                                onClick={() => void runSubscriptionAction('lock_basic')}
                                disabled={actionLoading || selectedUser.billingOverride === 'force_basic'}
                              >
                                Lock to Free
                              </button>
                              <button
                                className="secondary-cta"
                                onClick={() => void runSubscriptionAction('clear_override')}
                                disabled={actionLoading || selectedUser.billingOverride !== 'force_basic'}
                              >
                                Clear lock
                              </button>
                              {extension.billingProvider === 'patreon' ? (
                                <button className="secondary-cta" onClick={() => void runSubscriptionAction('refresh_patreon')} disabled={actionLoading}>
                                  Refresh Patreon
                                </button>
                              ) : null}
                            </div>
                            {actionStatus ? <p className="muted-copy">{actionStatus}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="muted-copy">Select a user from the list to inspect their journey.</p>
                    )}
                  </section>
                </section>
              ) : null}

              {adminSection === 'website' ? (

              <section className="info-card stack-md">
                <div className="section-label">Website conversion</div>
                <div className="admin-overview-grid admin-overview-grid-website">
                  {websiteOverviewCards.map((card) => (
                    <div key={card.label} className={`overview-card tone-${card.tone}`}>
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="website-insights-grid">
                  <section className="website-insight-panel">
                    <div className="section-label">Conversion path</div>
                    <div className="funnel-grid website-funnel-grid">
                      {websiteConversionSteps.map((step, index) => (
                        <div key={step.key} className="funnel-card">
                          <div className="funnel-step">{index + 1}</div>
                          <strong>{step.count}</strong>
                          <span>{step.label}</span>
                          <small>{step.rate}</small>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="website-insight-panel">
                    <div className="section-label">Visit sources</div>
                    <div className="table-list">
                      {websiteVisitSources.length ? websiteVisitSources.map((item) => (
                        <div key={item.source} className="table-row source-row">
                          <strong>{item.source}</strong>
                          <span>{item.count} visits</span>
                        </div>
                      )) : <p className="muted-copy">Website page views will start showing sources once people enter the product routes.</p>}
                    </div>
                  </section>
                  <section className="website-insight-panel">
                    <div className="section-label">Page visits</div>
                    <div className="table-list">
                      {websitePageViews.length ? websitePageViews.map((item) => (
                        <div key={item.page} className="table-row source-row">
                          <strong>{formatMetricLabel(item.page)}</strong>
                          <span>{item.count} views</span>
                        </div>
                      )) : <p className="muted-copy">No website page views tracked yet for this product and date range.</p>}
                    </div>
                  </section>
                </div>
              </section>
              ) : null}

              {adminSection === 'funnel' ? (
              <section className="admin-analysis-grid">
                <section className="info-card">
                  <div className="section-label">Funnel analysis</div>
                  <div className="funnel-tabs">
                    {[
                      { value: 'full', label: 'Full' },
                      { value: 'activation', label: 'Activation' },
                      { value: 'monetization', label: 'Monetization' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={`funnel-tab ${funnelView === option.value ? 'is-active' : ''}`}
                        onClick={() => setFunnelView(option.value as 'full' | 'activation' | 'monetization')}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="funnel-grid">
                    {filteredFunnel.map((step, index) => (
                      <div key={step.key} className="funnel-card">
                        <div className="funnel-step">Step {index + 1}</div>
                        <strong>{step.label}</strong>
                        <div className="funnel-count">{step.count}</div>
                        <span>{step.rate} of starting cohort</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="info-card">
                  <div className="section-label">Behavior summary</div>
                  <div className="table-list">
                    {derivedTopEvents.slice(0, 5).map((item) => (
                      <div key={item.eventName} className="table-row">
                        <span>{item.eventName}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                    {derivedTopScreens.slice(0, 3).map((item) => (
                      <div key={item.screen} className="table-row">
                        <span>Screen: {item.screen}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="muted-copy">This is the quick read before dropping into a single user journey.</p>
                </section>
              </section>
              ) : null}

              {adminSection === 'events' ? (
              <>
              <section className="admin-detail-grid">
                {data?.summary ? <MetricGrid title="Summary" data={data.summary} /> : null}
                {data?.aiUsage ? <MetricGrid title="AI usage" data={data.aiUsage} /> : null}
                {derivedTopEvents.length ? (
                  <section className="info-card">
                    <div className="section-label">Top events</div>
                    <div className="table-list">
                      {derivedTopEvents.map((item) => (
                        <div key={item.eventName} className="table-row">
                          <span>{item.eventName}</span>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
                {derivedTopScreens.length ? (
                  <section className="info-card">
                    <div className="section-label">Top screens</div>
                    <div className="table-list">
                      {derivedTopScreens.map((item) => (
                        <div key={item.screen} className="table-row">
                          <span>{item.screen}</span>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </section>
              {journeyRows.length ? (
                <section className="info-card">
                  <div className="section-label">User paths</div>
                  <div className="journey-grid">
                    {journeyRows.map((journey) => (
                      <div key={journey.userKey} className="journey-card">
                        <div className="event-top">
                          <strong>{journey.label}</strong>
                          <span>{journey.totalEvents} events</span>
                        </div>
                        <p className="muted-copy">Last seen {new Date(journey.lastSeen).toLocaleString()}</p>
                        <div className="journey-path">
                          {journey.path.slice(0, 6).map((step, index) => (
                            <span key={`${journey.userKey}-${step}-${index}`} className="journey-pill">{step}</span>
                          ))}
                        </div>
                        {journey.screens.length ? (
                          <p className="muted-copy">Screens: {journey.screens.slice(0, 4).join(' → ')}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              {filteredRecentEvents.length ? (
                <section className="info-card">
                  <div className="section-label">Event stream</div>
                  <p className="muted-copy">
                    {selectedUser
                      ? `Showing ${selectedUserEvents.length} events for ${selectedUser.label} during ${dateRange.label}.`
                      : `Showing ${filteredRecentEvents.length} events for app id ${selectedAppId} during ${dateRange.label}.`}
                  </p>
                  <div className="event-feed">
                    {(selectedUser ? selectedUserEvents : filteredRecentEvents).slice(0, 60).map((event, index) => {
                      const screen = typeof event.properties?.screen === 'string' ? event.properties.screen : ''
                      const surface = typeof event.properties?.surface === 'string' ? event.properties.surface : ''
                      return (
                        <div key={`${event.eventName}-${event.timestamp}-${index}`} className="event-card">
                          <div className="event-top">
                            <strong>{event.eventName}</strong>
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="event-meta">
                            <span>{getUserLabel(event)}</span>
                            {event.accountId ? <span>userId: {event.accountId}</span> : null}
                            {event.clientId ? <span>clientId: {event.clientId}</span> : null}
                            {event.appId ? <span>appId: {event.appId}</span> : null}
                            {screen ? <span>screen: {screen}</span> : null}
                            {surface ? <span>surface: {surface}</span> : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ) : null}
              {(selectedUser ? selectedUserSupportRequests : filteredSupportRequests).length ? (
                <section className="info-card">
                  <div className="section-label">Support requests</div>
                  <p className="muted-copy">
                    {selectedUser
                      ? `Showing ${selectedUserSupportRequests.length} support submissions linked to ${selectedUser.label}.`
                      : `Showing ${filteredSupportRequests.length} support submissions for app id ${selectedAppId} during ${dateRange.label}.`}
                  </p>
                  <div className="event-feed">
                    {(selectedUser ? selectedUserSupportRequests : filteredSupportRequests).map((item) => (
                      <div key={item.id} className="event-card">
                        <div className="event-top">
                          <strong>{item.subject}</strong>
                          <span>{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="event-meta">
                          <span>{item.accountEmail || item.replyEmail || 'Anonymous user'}</span>
                          <span>category: {item.category}</span>
                          {item.accountId ? <span>userId: {item.accountId}</span> : null}
                          {item.clientId ? <span>clientId: {item.clientId}</span> : null}
                          {item.appId ? <span>appId: {item.appId}</span> : null}
                        </div>
                        <p className="event-detail">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              {(selectedUser ? selectedUserFeedback : filteredUninstallFeedback).length ? (
                <section className="info-card">
                  <div className="section-label">Uninstall feedback</div>
                  <p className="muted-copy">
                    {selectedUser
                      ? `Showing ${selectedUserFeedback.length} uninstall entries linked to ${selectedUser.label}.`
                      : `Showing ${filteredUninstallFeedback.length} uninstall entries for app id ${selectedAppId} during ${dateRange.label}.`}
                  </p>
                  <div className="event-feed">
                    {(selectedUser ? selectedUserFeedback : filteredUninstallFeedback).map((item, index) => (
                      <div key={`${item.createdAt || 0}-${index}`} className="event-card">
                        <div className="event-top">
                          <strong>{item.reason || 'unknown'}</strong>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'No date'}</span>
                        </div>
                        <div className="event-meta">
                          <span>{item.accountEmail || 'Anonymous user'}</span>
                          {item.appId ? <span>appId: {item.appId}</span> : null}
                        </div>
                        {item.details ? <p className="event-detail">{item.details}</p> : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              </>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function NotFoundPage() {
  return <section className="article-card"><div className="pill">Not found</div><h1>This page does not belong to a configured extension.</h1><p className="article-intro">Go back to the hub and open one of the configured product routes.</p><a className="primary-cta inline-cta" href="/">Back to hub</a></section>
}

export default function App() {
  const route = useMemo(() => parseRoute(window.location.pathname), [])
  return (
    <AppShell extension={route.extension} page={route.page}>
      {route.page === 'hub' ? <HubPage /> : null}
      {route.page === 'product' && route.extension ? <ProductHome extension={route.extension} /> : null}
      {route.page === 'login' && route.extension ? <LoginPage extension={route.extension} /> : null}
      {route.page === 'pricing' && route.extension ? <PricingPage extension={route.extension} /> : null}
      {route.page === 'payment' && route.extension ? <PaymentPage extension={route.extension} /> : null}
      {route.page === 'privacy' && route.extension ? <ArticlePage extension={route.extension} title={`${route.extension.name} privacy`} eyebrow="Privacy" items={route.extension.privacySummary} /> : null}
      {route.page === 'terms' && route.extension ? <ArticlePage extension={route.extension} title={`${route.extension.name} terms`} eyebrow="Terms" items={route.extension.termsSummary} /> : null}
      {route.page === 'global-privacy' ? <GlobalPolicyPage title="Harika Extensions privacy" eyebrow="Privacy" items={GLOBAL_PRIVACY_SECTIONS} /> : null}
      {route.page === 'global-terms' ? <GlobalPolicyPage title="Harika Extensions terms of service" eyebrow="Terms" items={GLOBAL_TERMS_SECTIONS} /> : null}
      {route.page === 'support' && route.extension ? <SupportPage extension={route.extension} /> : null}
      {route.page === 'share' && route.extension && route.shareSlug ? <SharedNotePage extension={route.extension} slug={route.shareSlug} /> : null}
      {route.page === 'leave' && route.extension ? <LeavePage extension={route.extension} /> : null}
      {route.page === 'admin' ? <AdminPage /> : null}
      {route.page === 'not-found' ? <NotFoundPage /> : null}
    </AppShell>
  )
}
