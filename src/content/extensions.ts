export type ExtensionSlug = 'deep-note' | 'sketch-party' | 'quiz-solver'

export type ExtensionRequiredPage = {
  key: 'landing' | 'login' | 'pricing' | 'payment' | 'privacy' | 'terms' | 'support' | 'leave'
  label: string
  path: string
  required: boolean
  note: string
}

export type PolicySection = {
  title: string
  body: string[]
}

export type ExtensionDefinition = {
  slug: ExtensionSlug
  appId: string
  name: string
  category: string
  locale?: 'en' | 'tr'
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
  priceLabel?: string
  proFeatures: string[]
  supportBody: string
  privacySummary: PolicySection[]
  termsSummary: PolicySection[]
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
  billingProvider?: 'website' | 'patreon'
  adminApiBase?: string
  adminAnalyticsPath?: string
  adminAnalyticsAppId?: string
  adminSubscriptionPath?: string
  installUrl?: string
  installLabel?: string
  patreonPageUrl?: string
}

const deepNoteApi = import.meta.env.VITE_DEEP_NOTE_API_URL || 'https://harika-extensions-backend.notetaker-app-burak.workers.dev'

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
    tagline: 'Save what matters while you browse.',
    summary: 'Save text, screenshots, and quick thoughts from any page. Keep them organized and revisit them later with AI help.',
    iconPath: '/products/deep-note/icon.svg',
    heroBadge: 'Capture. Organize. Revisit.',
    heroTitle: 'A separate public home for the Deep Note extension.',
    heroBody:
      'Deep Note turns scattered highlights into notes you can actually come back to. Save first, organize later, and use AI when you need help.',
    callouts: [
      'Save text or images from any page without breaking your flow.',
      'Keep notes tidy with folders, tags, and lightweight structure.',
      'Use AI for summaries, suggestions, and note-based chat.',
    ],
    steps: [
      'Save a useful quote, screenshot, or idea while browsing.',
      'Drop it into Deep Note and keep it organized.',
      'Come back later to review, search, or ask across your notes.',
    ],
    pricingTitle: 'Deep Note Free and Pro',
    priceLabel: '$5 / month',
    pricingBody:
      'Use Deep Note for free, then upgrade to Pro on the website when you want AI-powered organization and a faster review workflow.',
    installUrl: 'https://chromewebstore.google.com/detail/deep-note/okiljkdbogmgfmfoldegeaejgndeicok?authuser=0&hl=en',
    installLabel: 'Get it on Chrome',
    proFeatures: [
      'AI summaries, smart tags, and folder suggestions.',
      'Chat across your saved notes.',
      'Extra premium workflows as Deep Note grows.',
    ],
    supportBody:
      'Get help with install, billing, login, sync, or product issues for Deep Note.',
    privacySummary: [
      {
        title: 'Information Deep Note processes',
        body: [
          'Deep Note processes note content, captured highlights, image references, page URLs, note titles, comments, reminders, and note organization data such as folders and tags. This information is used to provide the core note capture and review workflow inside the extension.',
          'For ordinary product use, Deep Note stores notes and most note-related state locally in the extension environment on the user’s device. This local-first behavior is part of the product design and helps keep basic note usage available without requiring a permanent remote account for every action.',
        ],
      },
      {
        title: 'When data is sent to backend services',
        body: [
          'Deep Note sends limited note content or account context to backend services only when the user actively triggers a feature that requires it. Examples include AI summaries, AI chat across saved notes, smart tag suggestions, folder suggestions, share-link generation, account-linked restore, support requests, and billing or entitlement checks.',
          'Those requests are made to complete the feature the user selected. Deep Note does not use note content for unrelated advertising purposes or to create unrelated cross-product marketing profiles.',
        ],
      },
      {
        title: 'Accounts, restore, and billing',
        body: [
          'Deep Note may use Google sign-in and Supabase-backed identity to restore account-linked state, reconnect a user after reinstalling the extension, and keep website billing or entitlement checks tied to the correct account. Patreon may also be linked on the website to determine whether the signed-in Deep Note account should receive Pro access.',
          'Billing and entitlement checks remain scoped to Deep Note specifically. Being signed in for Deep Note does not automatically sign a user into unrelated extensions that may exist on the same domain.',
        ],
      },
      {
        title: 'Sharing, support, and user controls',
        body: [
          'If a user creates a share link, the note content included in that share flow becomes accessible to anyone who has the link until it expires or is otherwise removed. Users should avoid sharing sensitive content through public links unless they are comfortable with that outcome.',
          'Users may also send support requests or uninstall feedback. Those submissions may include account identifiers, reply email addresses, and the support or feedback text the user chooses to provide. Users remain in control of what they store, what they share, and whether they connect account-linked billing or restore features.',
        ],
      },
    ],
    termsSummary: [
      {
        title: 'Use of the product',
        body: [
          'Deep Note is a browser extension for saving highlights, personal notes, reminders, and research context while browsing. By using Deep Note, users agree to use the product lawfully and responsibly and to take responsibility for the material they choose to save, organize, export, or share.',
          'Users must not use Deep Note to violate law, infringe intellectual property rights, distribute malware, or store or share content they do not have a right to use.',
        ],
      },
      {
        title: 'Accounts, subscriptions, and upgrades',
        body: [
          'Some features may depend on Google sign-in, website billing handoff, Patreon-linked entitlement, promo codes, or future account-linked restore flows. Paid features, eligibility, pricing, and billing providers may change over time as the product evolves.',
          'If a user upgrades through a linked billing provider, entitlement remains tied to the relevant Deep Note account. Promo access or Patreon-linked Pro access may expire, be revoked, or change according to the applicable plan rules or payment status.',
        ],
      },
      {
        title: 'Availability and feature changes',
        body: [
          'Deep Note is an actively evolving software product. Features, usage limits, storage behavior, layout, integrations, and AI-powered experiences may change over time. Some features may be revised or removed as the product matures.',
          'Deep Note may also limit access, suspend features, or change product behavior when necessary for abuse prevention, legal compliance, stability, or operational reasons.',
        ],
      },
      {
        title: 'Warranty and limitation of liability',
        body: [
          'Deep Note is provided on an as-is and as-available basis to the maximum extent permitted by applicable law. Deep Note does not guarantee uninterrupted availability, permanent preservation of data outside the stated storage or backup flows, or perfect accuracy of AI-generated output.',
          'To the maximum extent permitted by law, Deep Note will not be liable for indirect, incidental, consequential, or special damages arising from use of the product, including data loss, billing issues, sync failures, or inaccurate AI output.',
        ],
      },
    ],
    loginBody: [
      'Google sign-in keeps the same Deep Note account on the website and in the extension.',
      'Connect Patreon only after you are signed in with the right Google account.',
      'This sign-in applies to Deep Note only.',
    ],
    paymentBody: [
      'Billing stays on the website, not inside the extension.',
      'Google identifies the Deep Note account first, then Patreon adds the Pro plan to that account.',
      'Use this page for upgrades and future billing management.',
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
    billingProvider: 'patreon',
    adminApiBase: deepNoteApi,
    adminAnalyticsPath: '/api/admin/analytics',
    adminAnalyticsAppId: 'deep-note',
    adminSubscriptionPath: '/api/admin/subscription',
    patreonPageUrl: 'https://www.patreon.com/checkout/harikadev?rid=28253484',
  },
  {
    slug: 'quiz-solver',
    appId: 'quiz-solver',
    name: 'Quiz Solver AI',
    category: 'Chrome uzantısı',
    locale: 'tr',
    tagline: 'Soruları hızlı çöz, adım adım öğren.',
    summary: 'Quiz Solver AI, öğrenciler için hızlı çözüm ve açıklamalar sunar. Soruyu metin ya da görsel olarak gönder, kısa özet ve adım adım çözümü gör.',
    iconPath: '/products/quiz-solver/icon.svg',
    heroBadge: 'Hızlı çöz. Net öğren.',
    heroTitle: 'Quiz Solver AI için sade ve güvenilir bir web sayfası.',
    heroBody:
      'Quiz Solver AI, hızlı cevap vermekten çok doğru yolu göstermeye odaklanır. Her soru için adım adım çözüm ve kısa özet alırsın.',
    callouts: [
      'Soruyu metin veya ekran görüntüsü olarak gönder.',
      'Adım adım çözüm, kısa özet ve ipuçları al.',
      'Zor soruları kaydet, sonra tekrar et.',
    ],
    steps: [
      'Soruyu seç, metin yapıştır veya ekran görüntüsü ekle.',
      'Çözümü adım adım takip et ve önemli noktaları öğren.',
      'Benzer sorularla pratik yaparak konuyu pekiştir.',
    ],
    pricingTitle: 'Quiz Solver AI Ücretsiz ve Pro',
    priceLabel: '$5 / ay',
    pricingBody:
      'Ücretsiz plan temel çözüm için yeterli. Pro ile daha detaylı açıklamalar ve yoğun kullanım desteği alırsın.',
    proFeatures: [
      'Daha detaylı adım adım çözümler.',
      'Konu özetleri ve benzer soru önerileri.',
      'Sınırsız çözüm ve öncelikli işlem.',
    ],
    supportBody:
      'Kurulum, giriş, ödeme veya içerik sorunları için Quiz Solver AI desteğine buradan ulaş.',
    privacySummary: [
      {
        title: 'İşlenen içerikler',
        body: [
          'Quiz Solver AI, çözüm istediğin soru metnini veya görselini, seçtiğin ders bilgilerini ve oluşturduğun notları işler. Bu veri yalnızca çözüm üretmek ve açıklama sunmak için kullanılır.',
          'Varsayılan kullanımda sorular ve notlar uzantı içinde saklanabilir; hesap bağlantısı yapılmadığı sürece bulut yedekleme zorunlu değildir.',
        ],
      },
      {
        title: 'Hesap ve giriş akışı',
        body: [
          'Google ile giriş yapıldığında hesap kimliği, ödeme ve destek süreçlerinin doğru kullanıcıyla eşleşmesi için kullanılır.',
          'Quiz Solver AI, kullanıcı verilerini reklam amacıyla satmaz veya paylaşmaz.',
        ],
      },
      {
        title: 'Ödeme ve Pro erişim',
        body: [
          'Pro erişim Patreon üzerinden yönetilir ve yalnızca yetkilendirme için gerekli üyelik bilgileri kullanılır.',
          'Giriş ve ödeme bilgileri sadece Quiz Solver AI hesabı için geçerlidir.',
        ],
      },
    ],
    termsSummary: [
      {
        title: 'Kullanım kuralları',
        body: [
          'Quiz Solver AI, öğrencilerin öğrenmesini desteklemek için tasarlanmıştır. Uzantı, kötüye kullanım, spam veya başkalarının haklarını ihlal edecek şekilde kullanılamaz.',
          'Kullanıcılar paylaştıkları içerikten sorumludur.',
        ],
      },
      {
        title: 'Özellikler ve ücretli plan',
        body: [
          'Ücretli özellikler, fiyatlandırma ve plan içerikleri zaman içinde güncellenebilir.',
          'Pro erişim, ödeme sağlayıcısındaki üyelik durumuna göre aktif veya pasif olabilir.',
        ],
      },
      {
        title: 'Sorumluluk sınırı',
        body: [
          'Quiz Solver AI, sağlanan çözümlerin doğruluğunu garanti etmez ve oluşabilecek sonuçlardan sorumlu tutulamaz.',
          'Hizmet, mevcut haliyle sunulur ve kesintisiz çalışma garantisi verilmez.',
        ],
      },
    ],
    loginBody: [
      'Uzantıda kullandığın Google hesabı ile giriş yapman önerilir.',
      'Ödeme ve Pro erişim bu hesap üzerinden eşleştirilir.',
      'Giriş, yalnızca Quiz Solver AI için geçerlidir.',
    ],
    paymentBody: [
      'Ödeme işlemleri uzantı dışında, web sitesinde yapılır.',
      'Google hesabın Pro erişimi doğru şekilde bağlamak için kullanılır.',
      'Patreon bağlantısı tamamlandığında Pro erişim otomatik senkron olur.',
    ],
    requiredPages: buildRequiredPages('quiz-solver'),
    features: {
      leavePage: true,
      websiteBilling: true,
      loginPage: true,
      paymentPage: true,
      adminAnalytics: true,
    },
    apiBase: deepNoteApi,
    billingProvider: 'patreon',
    adminApiBase: deepNoteApi,
    adminAnalyticsPath: '/api/admin/analytics',
    adminAnalyticsAppId: 'quiz-solver',
    adminSubscriptionPath: '/api/admin/subscription',
    installUrl: 'https://chromewebstore.google.com/detail/quiz-solver-ai/ijlpijnplhhbggppiebkfakonpjdikhl?hl=en-US&utm_source=ext_sidebar',
    patreonPageUrl: 'https://www.patreon.com/checkout/harikadev?rid=28253484',
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
    priceLabel: '$5 / month',
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
      {
        title: 'Local extension state',
        body: [
          'Sketch Party stores certain extension settings locally so it can remember onboarding state, guest party code, effect preferences, online visibility, and other product controls between sessions. This local state supports the normal operation of the extension and avoids unnecessary reconfiguration every time the browser opens.',
        ],
      },
      {
        title: 'Account-linked and subscription-linked information',
        body: [
          'When a user chooses an account-linked version of Sketch Party, the product may process account identity, authentication state, subscription state, saved profile details, saved friends, and account preferences so the same profile and entitlement can be restored later. Under the current product direction, Patreon-based login and Patreon subscription status are expected to determine paid access and future Pro entitlements.',
          'That means Sketch Party may process Patreon-linked identity and membership state when it is necessary to determine whether a user should receive account-linked features or paid plan access.',
        ],
      },
      {
        title: 'Realtime social features',
        body: [
          'Sketch Party may process drawings, lightweight messages, effect events, session identifiers, and related delivery data when the user actively triggers a friend-to-friend interaction. This processing is part of the product experience and is limited to delivering the feature the user selected.',
          'Sketch Party is not designed to sell personal data, sell browsing history, or create unrelated advertising profiles from browsing behavior.',
        ],
      },
      {
        title: 'Overlay behavior, support, and controls',
        body: [
          'Because Sketch Party can render optional drawings or effects on the page the recipient is currently viewing, the extension may inspect limited visible page structure locally in the browser so an effect can be positioned correctly. This access is feature-driven and user-controlled.',
          'Users can control whether they appear online, whether they receive drawings, and whether surprise effects are allowed. If a user contacts support or submits uninstall feedback, Sketch Party may process the information the user provides for operational and support purposes.',
        ],
      },
    ],
    termsSummary: [
      {
        title: 'Consensual and acceptable use',
        body: [
          'Sketch Party is intended for playful, consensual interactions between users who choose to connect with one another. Users must not use the extension to harass, impersonate, deceive, threaten, stalk, or otherwise abuse other people.',
          'Users are responsible for the drawings, messages, profile names, and effects they choose to send, and they must ensure their use of the extension fits the rules, relationships, and environments in which they use it.',
        ],
      },
      {
        title: 'Features and paid access',
        body: [
          'Sketch Party may evolve over time, including changes to guest mode, account-linked flows, subscription structure, Patreon-linked entitlement logic, and supported visual effects. Some features may remain free, while others may require an account-linked or paid plan.',
          'Sketch Party may suspend, restrict, or remove access where necessary for abuse prevention, legal compliance, product stability, or operational safety.',
        ],
      },
      {
        title: 'Social behavior expectations',
        body: [
          'Some Sketch Party experiences may be visually surprising in presentation, but they are still expected to remain consensual and user-controlled. Users may not use Sketch Party to trick, harm, or misrepresent themselves to others, even if the effect itself appears playful.',
          'If behavior appears abusive, disruptive, or inconsistent with the intended social use of the product, Sketch Party may limit or revoke access to some or all product features.',
        ],
      },
      {
        title: 'Warranty and limitation of liability',
        body: [
          'Sketch Party is provided on an as-is and as-available basis to the maximum extent permitted by law. Reasonable efforts may be made to keep the product stable and secure, but uninterrupted availability, perfect compatibility with every website, and permanent preservation of every product state cannot be guaranteed.',
          'Product-specific privacy, support, billing, and legal obligations remain scoped to Sketch Party even when some infrastructure is shared with other products on the same domain.',
        ],
      },
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
    billingProvider: 'patreon',
    adminAnalyticsAppId: 'sketch-party',
    installUrl: 'https://chrome.google.com/webstore',
    patreonPageUrl: 'https://www.patreon.com/checkout/harikadev?rid=28253484',
  },
]

export const extensionMap = new Map(extensions.map((item) => [item.slug, item]))
