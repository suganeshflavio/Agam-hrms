/**
 * Zoho OneAuth sign-in (disabled unless VITE_ENABLE_ZOHO_LOGIN=true).
 * The browser only builds the authorization URL; the backend exchanges the
 * code with its own client secret and signs in the matching Core HRMS user.
 */
export interface ZohoOAuthConfig {
  clientId: string
  authUrl: string
  redirectUri: string
  scope: string
}

export const getZohoConfig = (): ZohoOAuthConfig => ({
  clientId: import.meta.env.VITE_ZOHO_CLIENT_ID || '',
  authUrl: import.meta.env.VITE_ZOHO_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/auth',
  redirectUri:
    import.meta.env.VITE_ZOHO_REDIRECT_URI ||
    (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:5173/auth/callback'),
  scope: import.meta.env.VITE_ZOHO_SCOPE || 'AaaServer.profile.READ,email,profile',
})

export const getZohoAuthorizationUrl = (state = 'zoho_sso_handshake'): string => {
  const config = getZohoConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scope,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${config.authUrl}?${params.toString()}`
}
