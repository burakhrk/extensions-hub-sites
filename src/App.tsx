import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { extensionMap, extensions, type ExtensionDefinition, type ExtensionSlug } from './content/extensions'

type PageKey =
  | 'hub'
  | 'product'
  | 'login'
  | 'pricing'
  | 'payment'
  | 'privacy'
  | 'terms'
  | 'support'
  | 'share'
  | 'leave'
  | 'admin'
  | 'not-found'

type BillingState = {
  plan: 'basic' | 'pro'
  trialStartedAt: number | null
  trialEndsAt: number | null
  isTrialActive: boolean
  promoCodeApplied: string | null
  source: 'basic' | 'trial' | 'promo' | 'pro'
  accountId: string | null
  accountEmail: string | null
  checkoutUrl?: string | null
  portalUrl?: string | null
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
  summary?: Record<string, number>
  aiUsage?: Record<string, number>
  funnels?: Record<string, number>
  topEvents?: Array<{ eventName: string; count: number }>
  screenCounts?: Array<{ screen: string; count: number }>
  recentEvents?: Array<{
    eventName: string
    timestamp: number
    clientId?: string
    accountEmail?: string | null
    accountId?: string | null
    properties?: Record<string, unknown>
  }>
  uninstallFeedback?: Array<{
    createdAt?: number
    accountEmail?: string | null
    reason?: string
    details?: string | null
  }>
}

function parseRoute(pathname: string): { page: PageKey; extension: ExtensionDefinition | null; shareSlug: string | null } {
  if (pathname === '/' || pathname === '') return { page: 'hub', extension: null, shareSlug: null }
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'admin') return { page: 'admin', extension: null, shareSlug: null }
  const first = parts[0] as ExtensionSlug | undefined
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

function AppShell({ children, extension, page }: { children: ReactNode; extension: ExtensionDefinition | null; page: PageKey }) {
  return (
    <div className="site-shell">
      <div className="site-frame">
        <header className="topbar">
          <a className="brand" href="/">
            <div className="brand-mark">BH</div>
            <div>
              <div className="brand-title">Extensions Hub</div>
              <div className="brand-subtitle">{extension ? `${extension.name} public pages` : 'Multi-extension public site'}</div>
            </div>
          </a>
          <nav className="topnav">
            <a className={!extension && page === 'hub' ? 'is-active' : ''} href="/">Home</a>
            <a className={page === 'admin' ? 'is-active' : ''} href="/admin">Admin</a>
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
          <span>{extension ? `${extension.name} stays scoped to its own route.` : 'Each extension gets separate product pages and extension-scoped admin analytics.'}</span>
        </footer>
      </div>
    </div>
  )
}

function HubPage() {
  return (
    <div className="stack-lg">
      <section className="hero-card">
        <div className="pill">Extensions hub</div>
        <h1>One domain for multiple extension websites.</h1>
        <p>Each extension gets its own landing page, login page, payment handoff, privacy policy, terms, support route, and uninstall feedback page without sharing product copy.</p>
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
          <a className="primary-cta" href={`/${extension.slug}/pricing`}>Pricing</a>
          <a className="secondary-cta" href={`/${extension.slug}/support`}>Support</a>
        </div>
      </section>
      <section className="two-col">
        <div className="info-card">
          <div className="section-label">What this page is for</div>
          <div className="list-grid">
            {extension.callouts.map((item) => <div key={item} className="list-box">{item}</div>)}
          </div>
        </div>
        <div className="info-card accent-card">
          <div className="section-label accent-text">Simple route logic</div>
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
        <div className="section-label">Required public pages</div>
        <div className="required-page-grid">
          {extension.requiredPages.map((page) => (
            <div key={page.path} className="required-page-card">
              <div className="required-page-top">
                <strong>{page.label}</strong>
                <span className="mini-pill">{page.required ? 'Required' : 'Optional'}</span>
              </div>
              <code>{page.path}</code>
              <p>{page.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PricingPage({ extension }: { extension: ExtensionDefinition }) {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') === 'manage' ? 'manage' : 'upgrade'
  const [identity] = useState(() => {
    const storageKey = `${extension.slug}:pricing-identity`
    const stored = window.localStorage.getItem(storageKey)
    let saved: { clientId: string; accountId: string; email: string } | null = null
    if (stored) {
      try { saved = JSON.parse(stored) as { clientId: string; accountId: string; email: string } } catch { saved = null }
    }
    return {
      clientId: params.get('clientId') || saved?.clientId || '',
      accountId: params.get('accountId') || saved?.accountId || '',
      email: params.get('email') || saved?.email || '',
    }
  })
  const [state, setState] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(Boolean(extension.apiBase && identity.clientId && identity.accountId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!identity.clientId || !identity.accountId) return
    window.localStorage.setItem(`${extension.slug}:pricing-identity`, JSON.stringify(identity))
  }, [extension.slug, identity])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!extension.apiBase || !identity.clientId || !identity.accountId) {
        setLoading(false)
        return
      }
      try {
        const query = new URLSearchParams({ clientId: identity.clientId, accountId: identity.accountId })
        if (identity.email) query.set('email', identity.email)
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
  }, [extension.apiBase, identity])

  const trialEndsLabel = state?.trialEndsAt ? new Date(state.trialEndsAt).toLocaleString() : null

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
            <p><strong>Google account:</strong> {identity.email || state?.accountEmail || 'Sign in from the extension first'}</p>
            {loading ? <p>Loading billing state...</p> : null}
            {error ? <p className="warning">{error}</p> : null}
            {!loading && state?.isTrialActive ? <p><strong>Trial active.</strong> {trialEndsLabel ? ` Ends ${trialEndsLabel}.` : ''}</p> : null}
            {!loading && state && !state.isTrialActive ? <p><strong>Current plan:</strong> {state.plan}</p> : null}
            {mode === 'manage'
              ? <p>{state?.portalUrl ? 'Billing portal is available below.' : 'Billing portal will appear here once it is connected.'}</p>
              : <p>{state?.checkoutUrl ? 'Checkout is available below.' : 'This page is ready for website billing once the provider is connected.'}</p>}
            {mode === 'manage' && state?.portalUrl ? <a className="primary-cta inline-cta" href={state.portalUrl}>Open billing portal</a> : null}
            {mode !== 'manage' && state?.checkoutUrl ? <a className="primary-cta inline-cta" href={state.checkoutUrl}>Continue to checkout</a> : null}
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
  return (
    <section className="article-card">
      <div className="pill">Login</div>
      <h1>{extension.name} login</h1>
      <p className="article-intro">This login route belongs only to {extension.name}. It should explain account restore, Google sign-in, and extension-scoped identity clearly.</p>
      <div className="stack-md">
        {extension.loginBody.map((item) => <section key={item} className="article-section"><p>{item}</p></section>)}
      </div>
    </section>
  )
}

function PaymentPage({ extension }: { extension: ExtensionDefinition }) {
  return (
    <section className="article-card">
      <div className="pill">Payment</div>
      <h1>{extension.name} payment handoff</h1>
      <p className="article-intro">Every extension on this hub should keep checkout and billing handoff on its own website route instead of embedding payment directly inside the extension.</p>
      <div className="stack-md">
        {extension.paymentBody.map((item) => <section key={item} className="article-section"><p>{item}</p></section>)}
      </div>
      <div className="cta-row">
        <a className="primary-cta" href={`/${extension.slug}/pricing`}>Open pricing</a>
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
        {items.map((item) => <section key={item} className="article-section"><p>{item}</p></section>)}
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
  const params = new URLSearchParams(window.location.search)
  const clientId = params.get('clientId') || ''
  const accountId = params.get('accountId') || ''
  const accountEmail = params.get('email') || ''
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
      <p className="article-intro">Each extension on this hub should own its own uninstall feedback page. This route is scoped only to {extension.name}.</p>
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
  const [passcode, setPasscode] = useState(() => window.localStorage.getItem('hub-admin-passcode') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null)

  const extension = extensionMap.get(selectedSlug) || extensions[0]

  useEffect(() => {
    window.localStorage.setItem('hub-admin-passcode', passcode)
  }, [passcode])

  const loadAnalytics = async () => {
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
      const res = await fetch(`${extension.adminApiBase}${extension.adminAnalyticsPath}`, {
        headers: { 'x-admin-passcode': passcode.trim() },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Admin analytics could not be loaded.')
      setData(payload as AdminAnalyticsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin analytics could not be loaded.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack-lg">
      <section className="hero-card">
        <div className="pill">Admin analytics</div>
        <h1>View extension events from one hub panel.</h1>
        <p>Select an extension, enter its admin passcode, and load summary metrics plus recent events without mixing products together.</p>
      </section>
      <section className="two-col">
        <div className="info-card">
          <div className="section-label">Extension selector</div>
          <div className="stack-md">
            <label className="field">
              <span>Extension</span>
              <select value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value as ExtensionSlug)}>
                {extensions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Admin passcode</span>
              <input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Enter passcode" />
            </label>
            <button className="button-cta inline-cta" onClick={() => void loadAnalytics()} disabled={loading}>
              {loading ? 'Loading...' : 'Load events'}
            </button>
            <p className="muted-copy">
              {extension.adminApiBase && extension.adminAnalyticsPath
                ? `This extension is wired to ${extension.adminAnalyticsPath}.`
                : 'This extension still needs its own analytics endpoint config.'}
            </p>
            {error ? <p className="warning">{error}</p> : null}
          </div>
        </div>
        <div className="info-card accent-card">
          <div className="section-label accent-text">Per-extension rule</div>
          <div className="stack-sm">
            <p>Every extension should expose its own analytics endpoint and keep product events separate even if the UI hub is shared.</p>
            <p>This page should never merge different extension event streams into one shared table.</p>
          </div>
        </div>
      </section>
      {data?.summary ? <MetricGrid title="Summary" data={data.summary} /> : null}
      {data?.funnels ? <MetricGrid title="Funnels" data={data.funnels} /> : null}
      {data?.aiUsage ? <MetricGrid title="AI usage" data={data.aiUsage} /> : null}
      {data?.topEvents?.length ? (
        <section className="info-card">
          <div className="section-label">Top events</div>
          <div className="table-list">
            {data.topEvents.map((item) => (
              <div key={item.eventName} className="table-row">
                <span>{item.eventName}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {data?.recentEvents?.length ? (
        <section className="info-card">
          <div className="section-label">Recent events</div>
          <div className="event-feed">
            {data.recentEvents.slice(0, 60).map((event, index) => {
              const screen = typeof event.properties?.screen === 'string' ? event.properties.screen : ''
              const surface = typeof event.properties?.surface === 'string' ? event.properties.surface : ''
              return (
                <div key={`${event.eventName}-${event.timestamp}-${index}`} className="event-card">
                  <div className="event-top">
                    <strong>{event.eventName}</strong>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="event-meta">
                    <span>{event.accountEmail || event.accountId || event.clientId || 'Anonymous user'}</span>
                    {screen ? <span>screen: {screen}</span> : null}
                    {surface ? <span>surface: {surface}</span> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
      {data?.uninstallFeedback?.length ? (
        <section className="info-card">
          <div className="section-label">Uninstall feedback</div>
          <div className="event-feed">
            {data.uninstallFeedback.map((item, index) => (
              <div key={`${item.createdAt || 0}-${index}`} className="event-card">
                <div className="event-top">
                  <strong>{item.reason || 'unknown'}</strong>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'No date'}</span>
                </div>
                <div className="event-meta">
                  <span>{item.accountEmail || 'Anonymous user'}</span>
                </div>
                {item.details ? <p className="event-detail">{item.details}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
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
      {route.page === 'support' && route.extension ? <SupportPage extension={route.extension} /> : null}
      {route.page === 'share' && route.extension && route.shareSlug ? <SharedNotePage extension={route.extension} slug={route.shareSlug} /> : null}
      {route.page === 'leave' && route.extension ? <LeavePage extension={route.extension} /> : null}
      {route.page === 'admin' ? <AdminPage /> : null}
      {route.page === 'not-found' ? <NotFoundPage /> : null}
    </AppShell>
  )
}
