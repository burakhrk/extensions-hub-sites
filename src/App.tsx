import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { extensionMap, extensions, type ExtensionDefinition, type ExtensionSlug } from './content/extensions'
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

function readWebsiteHandoff(extension: ExtensionDefinition, scope: 'login' | 'pricing' | 'leave'): WebsiteHandoffIdentity {
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

function buildUserKey(accountId?: string | null, clientId?: string | null): string {
  if (accountId) return `account:${accountId}`
  return `client:${clientId || 'anonymous'}`
}

function getUserLabel(user: { accountEmail?: string | null; accountId?: string | null; clientId?: string | null }): string {
  return user.accountEmail || user.accountId || user.clientId || 'Anonymous user'
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

function GlobalPolicyPage({ title, eyebrow, items }: { title: string; eyebrow: string; items: string[] }) {
  return (
    <section className="article-card">
      <div className="pill">{eyebrow}</div>
      <h1>{title}</h1>
      <p className="article-intro">These policies cover the shared website layer and OAuth clients used across Harika Extensions products. Product-specific routes may add extra details where needed.</p>
      <div className="stack-md">
        {items.map((item) => (
          <section key={item} className="article-section">
            {item.split('\n\n').map((paragraph, index) => <p key={`${item}-${index}`}>{paragraph}</p>)}
          </section>
        ))}
      </div>
    </section>
  )
}

const GLOBAL_PRIVACY_COPY = [
  'Harika Extensions operates a shared public website that supports multiple browser extensions, shared marketing pages, OAuth handoff flows, and account-linked support pages. This website may process limited account context such as extension app id, signed-in account id, email address, billing state, and support context when a user moves between an extension and the website.',
  'When a user signs in on the website, the goal is to keep the same account in sync with the related extension. Depending on the product, this may include Google-based account identity, shared billing state, Patreon-linked entitlement checks, support requests, and analytics about product usage. Sensitive freeform content like private note bodies, drawings, or personal messages should only be processed when a specific product feature requires it and that product policy says so.',
  'Harika Extensions does not use the shared website to merge unrelated products into a single user-facing account without context. Extension routes remain product-scoped, and billing or entitlement checks should remain scoped to the relevant extension app id. Shared infrastructure may be reused, but product-specific privacy expectations stay tied to the product routes themselves.',
]

const GLOBAL_TERMS_COPY = [
  'Harika Extensions provides a shared website layer for multiple browser extension products. The shared site may offer public landing pages, login handoff pages, pricing pages, support routes, payment handoff pages, and legal pages. Each extension remains responsible for its own product behavior, user-facing functionality, and product-specific obligations.',
  'Users agree not to misuse the website, shared OAuth handoff flows, or extension-specific routes for abuse, impersonation, automated scraping, credential misuse, or attempts to access another user’s extension data. Product-specific features, eligibility, and subscription logic may vary by extension and may change over time as products evolve.',
  'The shared site and related extension services are provided on an as-is and as-available basis to the maximum extent allowed by law. Harika Extensions may update routes, account flows, billing providers, and supporting services over time. Product-specific terms, privacy disclosures, and support expectations continue to apply on top of these shared website terms where relevant.',
]

function AppShell({ children, extension, page }: { children: ReactNode; extension: ExtensionDefinition | null; page: PageKey }) {
  return (
    <div className="site-shell">
      <div className={`site-frame ${page === 'admin' ? 'site-frame-admin' : ''}`}>
        <header className="topbar">
          <a className="brand" href="/">
            <div className="brand-mark">BH</div>
            <div>
              <div className="brand-title">Extensions Hub</div>
              <div className="brand-subtitle">{extension ? `${extension.name} on the web` : 'Discover browser tools built for real workflows'}</div>
            </div>
          </a>
          <nav className="topnav">
            <a className={!extension && page === 'hub' ? 'is-active' : ''} href="/">Home</a>
            {extension ? (
              <>
                <a className={page === 'product' ? 'is-active' : ''} href={`/${extension.slug}`}>Overview</a>
                <a className={page === 'login' ? 'is-active' : ''} href={`/${extension.slug}/login`}>Login</a>
                <a className={page === 'pricing' ? 'is-active' : ''} href={`/${extension.slug}/pricing`}>Pricing</a>
                <a className={page === 'payment' ? 'is-active' : ''} href={`/${extension.slug}/payment`}>Payment</a>
                <a className={page === 'privacy' ? 'is-active' : ''} href={`/${extension.slug}/privacy`}>Privacy</a>
                <a className={page === 'terms' ? 'is-active' : ''} href={`/${extension.slug}/terms`}>Terms</a>
                <a className={page === 'support' ? 'is-active' : ''} href={`/${extension.slug}/support`}>Support</a>
              </>
            ) : null}
          </nav>
        </header>
        <main className="main-content">{children}</main>
        <footer className="footer">
          <span>One domain, many extensions.</span>
          <span>{extension ? `${extension.name} stays scoped to its own route.` : 'Each product keeps its own website, support flow, and account handoff.'}</span>
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
  return (
    <div className="stack-lg">
      <section className="hero-card">
        <div className="pill">{extension.heroBadge}</div>
        <div className="product-hero-head">
          <img src={extension.iconPath} alt={extension.name} className="hero-icon" />
          <div>
            <div className="eyebrow">{extension.name}</div>
            <h1>{extension.heroTitle}</h1>
          </div>
        </div>
        <p>{extension.heroBody}</p>
        <div className="cta-row">
          {extension.installUrl ? <a className="primary-cta" href={extension.installUrl} target="_blank" rel="noreferrer">Install extension</a> : null}
          <a className="secondary-cta" href={`/${extension.slug}/login`}>Account</a>
          <a className="primary-cta" href={`/${extension.slug}/pricing`}>Pricing</a>
          <a className="secondary-cta" href={`/${extension.slug}/support`}>Support</a>
        </div>
      </section>
      <section className="two-col">
        <div className="info-card">
          <div className="section-label">Why people use it</div>
          <div className="list-grid">
            {extension.callouts.map((item) => <div key={item} className="list-box">{item}</div>)}
          </div>
        </div>
        <div className="info-card accent-card">
          <div className="section-label accent-text">Get started</div>
          <ol className="step-list">
            {extension.steps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="info-card">
        <div className="section-label">Where to go next</div>
        <div className="required-page-grid">
          <a className="required-page-card" href={`/${extension.slug}/login`}>
            <div className="required-page-top">
              <strong>Restore your account</strong>
              <span className="mini-pill">Account</span>
            </div>
            <p>Check sign-in status, reconnect the right Google account, and keep the website in sync with the extension.</p>
          </a>
          <a className="required-page-card" href={`/${extension.slug}/pricing`}>
            <div className="required-page-top">
              <strong>See plans and upgrades</strong>
              <span className="mini-pill">Plans</span>
            </div>
            <p>Review plans, trial status, and any website-based upgrade flow without getting pushed into the extension UI.</p>
          </a>
          <a className="required-page-card" href={`/${extension.slug}/support`}>
            <div className="required-page-top">
              <strong>Get support</strong>
              <span className="mini-pill">Help</span>
            </div>
            <p>Find install guidance, billing help, and product-specific troubleshooting without leaving this product route.</p>
          </a>
          <a className="required-page-card" href={`/${extension.slug}/privacy`}>
            <div className="required-page-top">
              <strong>Privacy and terms</strong>
              <span className="mini-pill">Legal</span>
            </div>
            <p>Review the product-specific legal and privacy details for this extension before you install or upgrade.</p>
          </a>
        </div>
      </section>
    </div>
  )
}

function PricingPage({ extension }: { extension: ExtensionDefinition }) {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') === 'manage' ? 'manage' : 'upgrade'
  const patreonStatus = params.get('patreon')
  const [identity] = useState(() => readWebsiteHandoff(extension, 'pricing'))
  const auth = useWebsiteAuthState()
  const [state, setState] = useState<BillingState | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(extension.apiBase && (identity.clientId || auth.user?.id)))
  const [error, setError] = useState<string | null>(null)
  const [patreonLoading, setPatreonLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)

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
  const effectiveClientId = identity.clientId || identity.accountId || auth.user?.id || ''
  const effectiveAccountId = identity.accountId || auth.user?.id || ''
  const effectiveEmail = identity.email || auth.user?.email || ''

  const handleApplyPromo = async () => {
    if (!extension.apiBase || !effectiveClientId || !effectiveAccountId) {
      setError('Sign in with the same Google account first so the promo can be tied to the right extension account.')
      return
    }

    const sanitizedPromo = promoCode.trim().toUpperCase()
    if (!sanitizedPromo) {
      setPromoMessage('Enter a promo code first.')
      return
    }

    setPromoLoading(true)
    setPromoMessage(null)
    setError(null)
    try {
      const res = await fetch(`${extension.apiBase}/api/billing/promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: extension.appId,
          clientId: effectiveClientId,
          accountId: effectiveAccountId,
          email: effectiveEmail || null,
          code: sanitizedPromo,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Promo code could not be redeemed.')
      }
      setState(data as BillingState)
      setPromoCode('')
      setPromoMessage('Promo applied. Pro access is active for 30 days on this extension account.')
    } catch (err) {
      setPromoMessage(err instanceof Error ? err.message : 'Promo code could not be redeemed.')
    } finally {
      setPromoLoading(false)
    }
  }

  const handleConnectPatreon = async () => {
    if (!extension.apiBase || !effectiveClientId || !effectiveAccountId) {
      setError('Sign in with the same Google account first so Patreon can be linked to the right extension account.')
      return
    }
    setError(null)
    setPatreonLoading(true)
    try {
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
    <div className="stack-lg">
      <section className="hero-card">
        <div className="pill">{extension.name} pricing</div>
        <h1>{extension.pricingTitle}</h1>
        <p>{extension.pricingBody}</p>
      </section>
        <section className="two-col">
          <div className="info-card">
            <div className="section-label">Current state</div>
            <div className="stack-sm">
              <p><strong>Google account:</strong> {auth.user?.email || identityEmail || 'Sign in from the extension first'}</p>
              {identity.source ? <p><strong>Opened from:</strong> {identity.source}</p> : null}
              {auth.loading ? <p>Checking website session...</p> : null}
              {auth.configured && !auth.user ? (
                <div className="auth-inline-box">
                  <p>Sign in on the website with the same Google account you use in the extension.</p>
                  <button
                    className="button-cta inline-cta"
                    onClick={() => {
                      setAuthError(null)
                      void signInOnWebsiteWithGoogle(window.location.href).catch((err) => setAuthError(err instanceof Error ? err.message : 'Website sign-in failed.'))
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
              {loading ? <p>Loading billing state...</p> : null}
              {authError ? <p className="warning">{authError}</p> : null}
              {error ? <p className="warning">{error}</p> : null}
              {patreonStatus === 'connected' ? <p><strong>Patreon connected.</strong> Your membership was synced back to this extension account.</p> : null}
              {patreonStatus === 'failed' ? <p className="warning">Patreon connection did not complete. Try again from this page.</p> : null}
              {!loading && state?.isTrialActive ? <p><strong>Trial active.</strong> {trialEndsLabel ? ` Ends ${trialEndsLabel}.` : ''}</p> : null}
              {!loading && state?.source === 'promo' ? <p><strong>Promo active.</strong> {trialEndsLabel ? ` Pro access ends ${trialEndsLabel}.` : ' Pro access lasts 30 days from redemption.'}</p> : null}
              {!loading && state && !state.isTrialActive && state.source !== 'promo' ? <p><strong>Current plan:</strong> {state.plan}</p> : null}
              {!loading && state ? <p><strong>Access source:</strong> {state.source}</p> : null}
            {isPatreonBilling ? (
              <>
                <p>
                  {state?.patreonConnected
                    ? 'This extension uses Patreon membership for entitlement sync. Reconnect if you changed tiers or switched accounts.'
                    : 'This extension uses Google sign-in for app identity and Patreon for plan entitlement. Link Patreon to sync your free or Pro status.'}
                </p>
                {state?.patreonConnected ? <p><strong>Connected Patreon user:</strong> {state.patreonUserId || 'Connected'}</p> : null}
                {state?.patreonTierIds?.length ? <p><strong>Entitled tiers:</strong> {state.patreonTierIds.join(', ')}</p> : null}
                {patreonLastSyncedLabel ? <p><strong>Last Patreon sync:</strong> {patreonLastSyncedLabel}</p> : null}
                <p className="muted-copy">Membership access refreshes automatically about every 6 hours. If you upgraded, cancelled, or got refunded, the change may take a little time to appear here.</p>
                <div className="cta-row compact-cta-row">
                  <button className="button-cta inline-cta" onClick={() => void handleConnectPatreon()} disabled={patreonLoading}>
                    {patreonLoading ? 'Opening Patreon...' : state?.patreonConnected ? 'Refresh Patreon access' : 'Connect Patreon'}
                  </button>
                  {state?.checkoutUrl ? <a className="secondary-cta" href={state.checkoutUrl} target="_blank" rel="noreferrer">Open Patreon package</a> : null}
                  {state?.portalUrl ? <a className="secondary-cta" href={state.portalUrl} target="_blank" rel="noreferrer">Manage Patreon billing</a> : null}
                </div>
              </>
            ) : mode === 'manage'
              ? <p>{state?.portalUrl ? 'Billing portal is available below.' : 'Billing portal will appear here once it is connected.'}</p>
              : <p>{state?.checkoutUrl ? 'Checkout is available below.' : 'This page is ready for website billing once the provider is connected.'}</p>}
            {!isPatreonBilling && mode === 'manage' && state?.portalUrl ? <a className="primary-cta inline-cta" href={state.portalUrl}>Open billing portal</a> : null}
            {!isPatreonBilling && mode !== 'manage' && state?.checkoutUrl ? <a className="primary-cta inline-cta" href={state.checkoutUrl}>Continue to checkout</a> : null}
            <div className="article-section">
              <p><strong>Have a promo code?</strong> Redeem it here to unlock 30 days of Pro on this extension account.</p>
              <div className="cta-row compact-cta-row">
                <input
                  className="text-input"
                  type="text"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                />
                <button className="button-cta inline-cta" onClick={() => void handleApplyPromo()} disabled={promoLoading}>
                  {promoLoading ? 'Applying...' : 'Redeem promo'}
                </button>
              </div>
              {promoMessage ? <p className={promoMessage.toLowerCase().includes('active') ? 'success' : 'warning'}>{promoMessage}</p> : null}
            </div>
          </div>
        </div>
        <div className="info-card accent-card">
          <div className="section-label accent-text">What Pro unlocks</div>
          <div className="list-grid">
            {extension.proFeatures.map((item) => <div key={item} className="list-box dark-box">{item}</div>)}
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
      <div className="pill">Login</div>
      <h1>{extension.name} login</h1>
      <p className="article-intro">Use the same Google account you use inside {extension.name} so your website access, billing state, and extension identity stay in sync.</p>
      <section className="article-section">
        <div className="stack-sm">
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
                  void signInOnWebsiteWithGoogle(window.location.href).catch((err) => setAuthError(err instanceof Error ? err.message : 'Website sign-in failed.'))
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
      </section>
      {identity.email || identity.accountId ? (
        <section className="article-section">
          <p><strong>Detected account:</strong> {identity.email || identity.accountId}</p>
          <p>This page picked up the same identity handoff used by the extension, so you can continue with the right account context.</p>
          {identity.source ? <p><strong>Opened from:</strong> {identity.source}</p> : null}
        </section>
      ) : null}
      <div className="stack-md">
        {extension.loginBody.map((item) => <section key={item} className="article-section"><p>{item}</p></section>)}
      </div>
      <div className="cta-row">
        {extension.installUrl ? <a className="primary-cta" href={extension.installUrl} target="_blank" rel="noreferrer">Install extension</a> : null}
        <a className="secondary-cta" href={`/${extension.slug}/pricing`}>Open pricing</a>
        <a className="secondary-cta" href={`/${extension.slug}/support`}>Get support</a>
      </div>
    </section>
  )
}

function PaymentPage({ extension }: { extension: ExtensionDefinition }) {
  const params = new URLSearchParams(window.location.search)
  const paymentStatus = params.get('status')
  const [identity] = useState(() => readWebsiteHandoff(extension, 'pricing'))
  const auth = useWebsiteAuthState()
  const [state, setState] = useState<BillingState | null>(null)
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
  }, [auth.user?.email, auth.user?.id, extension.apiBase, extension.appId, identity])

  const isPatreonBilling = extension.billingProvider === 'patreon'
  const patreonLastSyncedLabel = state?.patreonLastSyncedAt ? new Date(state.patreonLastSyncedAt).toLocaleString() : null
  return (
    <section className="article-card">
      <div className="pill">Payment</div>
      <h1>{extension.name} payment handoff</h1>
      <p className="article-intro">Checkout for {extension.name} should happen here on the website, with the same account context carried over from the extension.</p>
      {paymentStatus === 'connected' ? <p className="success"><strong>Patreon connected.</strong> Your membership is now linked back to this extension account.</p> : null}
      {paymentStatus === 'failed' ? <p className="warning">Patreon connection did not complete. You can retry from this page.</p> : null}
      {auth.user ? (
        <section className="article-section">
          <p><strong>Website account:</strong> {auth.user.email || auth.user.id}</p>
          <p>This checkout handoff is now tied to the same Supabase account system used by the extension.</p>
        </section>
      ) : null}
      {loading ? <p>Loading payment options...</p> : null}
      {error ? <p className="warning">{error}</p> : null}
      {state ? (
        <section className="article-section">
          <p><strong>Current plan:</strong> {state.plan}</p>
          <p><strong>Access source:</strong> {state.source}</p>
          {state.source === 'promo' && state.trialEndsAt ? <p><strong>Promo ends:</strong> {new Date(state.trialEndsAt).toLocaleString()}</p> : null}
          {state.isTrialActive && state.trialEndsAt ? <p><strong>Trial ends:</strong> {new Date(state.trialEndsAt).toLocaleString()}</p> : null}
          <p><strong>Billing provider:</strong> {state.billingProvider || 'website'}</p>
          {state.patreonConnected ? <p><strong>Patreon linked:</strong> {state.patreonUserId || 'Connected'}</p> : null}
          {patreonLastSyncedLabel ? <p><strong>Last Patreon sync:</strong> {patreonLastSyncedLabel}</p> : null}
          {isPatreonBilling ? <p className="muted-copy">Patreon entitlement is cached and refreshed automatically about every 6 hours so account checks stay lightweight. Refunds or cancellations will be reflected on the next sync window.</p> : null}
          <div className="cta-row">
            {state.checkoutUrl ? <a className="primary-cta" href={state.checkoutUrl} target="_blank" rel="noreferrer">{isPatreonBilling ? 'Open Patreon checkout' : 'Continue to checkout'}</a> : null}
            {state.portalUrl ? <a className="secondary-cta" href={state.portalUrl} target="_blank" rel="noreferrer">{isPatreonBilling ? 'Manage Patreon membership' : 'Open billing portal'}</a> : null}
            <a className="secondary-cta" href={`/${extension.slug}/pricing`}>Back to pricing</a>
          </div>
        </section>
      ) : null}
      <div className="stack-md">
        {extension.paymentBody.map((item) => <section key={item} className="article-section"><p>{item}</p></section>)}
      </div>
      <div className="cta-row">
        <a className="primary-cta" href={`/${extension.slug}/pricing`}>Open pricing</a>
        <a className="secondary-cta" href={`/${extension.slug}/support`}>Talk to support</a>
      </div>
    </section>
  )
}

function ArticlePage({ extension, title, eyebrow, items }: { extension: ExtensionDefinition; title: string; eyebrow: string; items: string[] }) {
  return (
    <section className="article-card">
      <div className="pill">{eyebrow}</div>
      <h1>{title}</h1>
      <p className="article-intro">{extension.name} stays separate from the other extensions on this domain. This page is only for {extension.name}.</p>
      <div className="stack-md">
        {items.map((item) => (
          <section key={item} className="article-section">
            {item.split('\n\n').map((paragraph, index) => <p key={`${item}-${index}`}>{paragraph}</p>)}
          </section>
        ))}
      </div>
    </section>
  )
}

function SupportPage({ extension }: { extension: ExtensionDefinition }) {
  return (
    <section className="article-card">
      <div className="pill">Support</div>
      <h1>{extension.name} support</h1>
      <p className="article-intro">{extension.supportBody}</p>
      <div className="stack-md">
        <section className="article-section">
          <p>Recommended support routes for this product:</p>
          <ul className="simple-list">
            <li>install and login issues</li>
            <li>billing and pricing questions for this extension only</li>
            <li>product-specific bug reports</li>
            <li>privacy and terms questions for this extension route</li>
            <li>uninstall feedback routing through its own leave page</li>
          </ul>
        </section>
        <section className="article-section">
          <p>Useful links for a first support pass:</p>
          <div className="cta-row">
            {extension.installUrl ? <a className="primary-cta" href={extension.installUrl} target="_blank" rel="noreferrer">Install / open store</a> : null}
            <a className="secondary-cta" href={`/${extension.slug}/login`}>Login help</a>
            <a className="secondary-cta" href={`/${extension.slug}/pricing`}>Pricing</a>
          </div>
        </section>
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
    <section className="article-card">
      <div className="pill">{extension.name} shared note</div>
      <h1>{note.title || 'Untitled note'}</h1>
      {note.summary ? <div className="article-section"><strong>AI Summary</strong><p>{note.summary}</p></div> : null}
      {note.text ? <div className="article-section"><strong>Captured Text</strong><p>{note.text}</p></div> : null}
      {note.opinion ? <div className="article-section"><strong>Thoughts</strong><p>{note.opinion}</p></div> : null}
      {note.url ? <a className="secondary-cta inline-cta" href={note.url} target="_blank" rel="noreferrer">Source link</a> : null}
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
      if (!authenticateOnly) {
        setData(payload as AdminAnalyticsResponse)
      }
    } catch (err) {
      setIsAuthenticated(false)
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

    data?.users?.forEach((user) => {
      const key = buildUserKey(user.accountId, user.clientId)
      byKey.set(key, {
        userKey: key,
        label: getUserLabel(user),
        clientId: user.clientId || null,
        accountId: user.accountId || null,
        accountEmail: user.accountEmail || null,
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
      const key = buildUserKey(event.accountId, event.clientId)
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, {
          userKey: key,
          label: getUserLabel(event),
          clientId: event.clientId || null,
          accountId: event.accountId || null,
          accountEmail: event.accountEmail || null,
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
    return filteredRecentEvents
      .filter((event) => buildUserKey(event.accountId, event.clientId) === selectedUser.userKey)
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [filteredRecentEvents, selectedUser])

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

  const runSubscriptionAction = async (action: 'grant_pro' | 'revoke_pro') => {
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
      setActionStatus(action === 'grant_pro' ? 'Pro granted for the selected user.' : 'Pro removed for the selected user.')
      await loadAnalytics()
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Admin action failed.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
      <div className="stack-lg">
        <section className="hero-card">
          <div className="pill">Admin analytics</div>
        <h1>{isAuthenticated ? 'Professional extension analytics workspace' : 'Admin sign in'}</h1>
        <p>{isAuthenticated ? 'Read the funnel first, then inspect user-level journeys, ids, and plan status without mixing extension streams together.' : 'Enter the admin password to unlock the analytics workspace for your extensions.'}</p>
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
                  <p>Start with users, then read behavior, billing state, support, and churn without mixing extensions together.</p>
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
                      {supportsSubscriptionActions ? (
                        <div className="admin-action-panel">
                          <div>
                            <div className="section-label">Quick actions</div>
                            <p className="muted-copy">Grant or revoke Pro using the selected Google-linked account or client identity.</p>
                          </div>
                          <div className="cta-row">
                            <button className="button-cta inline-cta" onClick={() => void runSubscriptionAction('grant_pro')} disabled={actionLoading}>
                              {actionLoading ? 'Working...' : 'Grant Pro'}
                            </button>
                            <button className="secondary-cta" onClick={() => void runSubscriptionAction('revoke_pro')} disabled={actionLoading}>
                              Revoke Pro
                            </button>
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

              <section className="admin-overview-grid">
                {overviewCards.map((card) => (
                  <div key={card.label} className={`overview-card tone-${card.tone}`}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </div>
                ))}
              </section>

              <section className="admin-analysis-grid">
                <section className="info-card">
                  <div className="section-label">Funnel analysis</div>
                  <div className="funnel-grid">
                    {derivedFunnel.map((step, index) => (
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
      {route.page === 'global-privacy' ? <GlobalPolicyPage title="Harika Extensions privacy" eyebrow="Privacy" items={GLOBAL_PRIVACY_COPY} /> : null}
      {route.page === 'global-terms' ? <GlobalPolicyPage title="Harika Extensions terms of service" eyebrow="Terms" items={GLOBAL_TERMS_COPY} /> : null}
      {route.page === 'support' && route.extension ? <SupportPage extension={route.extension} /> : null}
      {route.page === 'share' && route.extension && route.shareSlug ? <SharedNotePage extension={route.extension} slug={route.shareSlug} /> : null}
      {route.page === 'leave' && route.extension ? <LeavePage extension={route.extension} /> : null}
      {route.page === 'admin' ? <AdminPage /> : null}
      {route.page === 'not-found' ? <NotFoundPage /> : null}
    </AppShell>
  )
}
