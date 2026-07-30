import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const apiModules = {
  '/api/events': () => import('./api/events.js'),
  '/api/officials': () => import('./api/officials.js'),
  '/api/summarize': () => import('./api/summarize.js'),
}

const localApiPlugin = () => ({
  name: 'civiq-local-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url, `http://${request.headers.host}`)
      const loadModule = apiModules[url.pathname]
      if (!loadModule) return next()

      try {
        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        const body = chunks.length ? Buffer.concat(chunks) : undefined
        const headers = new Headers()
        Object.entries(request.headers).forEach(([name, value]) => {
          if (Array.isArray(value)) value.forEach((item) => headers.append(name, item))
          else if (value !== undefined) headers.set(name, value)
        })

        const webRequest = new Request(url, {
          method: request.method,
          headers,
          body,
        })
        const module = await loadModule()
        const webResponse = await module.default.fetch(webRequest)

        response.statusCode = webResponse.status
        webResponse.headers.forEach((value, name) => response.setHeader(name, value))
        response.end(Buffer.from(await webResponse.arrayBuffer()))
      } catch (error) {
        server.config.logger.error(error)
        response.statusCode = 500
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ error: 'The local API failed unexpectedly.' }))
      }
    })
  },
})

// Serves the same stateless API modules locally that Vercel deploys from /api.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.entries(env).forEach(([name, value]) => {
    if (process.env[name] === undefined) process.env[name] = value
  })

  return {
    plugins: [react(), localApiPlugin()],
    server: {
      host: '127.0.0.1',
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
  }
})
