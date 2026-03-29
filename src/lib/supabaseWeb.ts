import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let client: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

export function getSupabaseWebClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.')
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  }

  return client
}

export async function getWebsiteUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabaseWebClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.user ?? null
  }
  return data.user ?? null
}

export async function getWebsiteSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabaseWebClient()
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

export async function signInOnWebsiteWithGoogle(redirectTo?: string): Promise<void> {
  const supabase = getSupabaseWebClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || window.location.href,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) throw new Error(error.message)
}

export async function signOutOnWebsite(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = getSupabaseWebClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
