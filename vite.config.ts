import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      tailwindcss(),
      vue(),
      vueJsx(),
      vueDevTools(),
      {
        name: 'zoho-oauth-proxy-middleware',
        configureServer(server) {
          // Token Exchange Proxy: POST /api/zoho/token
          server.middlewares.use('/api/zoho/token', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const clientId = env.VITE_ZOHO_CLIENT_ID || payload.client_id || '1000.9I5RNGD1I9CLRSEFUOG7NOXD5Z1O2Z'
                const clientSecret = env.VITE_ZOHO_CLIENT_SECRET || payload.client_secret || '27e945ca308637ef278d7519c2481035a868c8348e'
                const accountsServer = payload.accounts_server || 'https://accounts.zoho.in'
                const tokenUrl = env.VITE_ZOHO_TOKEN_URL || (accountsServer ? `${accountsServer}/oauth/v2/token` : 'https://accounts.zoho.in/oauth/v2/token')

                const params = new URLSearchParams({
                  code: payload.code || '',
                  client_id: clientId,
                  client_secret: clientSecret,
                  redirect_uri: payload.redirect_uri || env.VITE_ZOHO_REDIRECT_URI || 'http://localhost:5173/auth/callback',
                  grant_type: 'authorization_code',
                })

                const tokenRes = await fetch(tokenUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: params.toString(),
                })

                const tokenData = await tokenRes.json()
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = tokenRes.status
                res.end(JSON.stringify(tokenData))
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message || 'Token exchange failed' }))
              }
            })
          })

          // User Info Proxy: GET /api/zoho/userinfo
          server.middlewares.use('/api/zoho/userinfo', async (req, res) => {
            try {
              const authHeader = req.headers.authorization || ''
              const urlObj = new URL(req.url || '', 'http://localhost:5173')
              const serverParam = urlObj.searchParams.get('server') || 'https://accounts.zoho.in'
              const userinfoUrl = env.VITE_ZOHO_USERINFO_URL || `${serverParam}/oauth/v2/userinfo`
              const userRes = await fetch(userinfoUrl, {
                headers: { Authorization: authHeader },
              })
              const userData = await userRes.json()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = userRes.status
              res.end(JSON.stringify(userData))
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message || 'Userinfo fetch failed' }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
