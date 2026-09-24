import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { IncomingMessage, ServerResponse } from 'node:http'

const MAX_REQUEST_BYTES = 70_000
const MAX_RESPONSE_BYTES = 500_000

function isPrivateAddress(address: string): boolean {
  if (address.includes(':')) {
    const value = address.toLowerCase()
    return value === '::1' || value === '::' || value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('::ffff:')
  }
  const parts = address.split('.').map(Number)
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 ||
    a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19) ||
    a >= 224
}

async function validateUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  const hostname = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password ||
    isIP(hostname) || hostname === 'localhost' || hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Use a public HTTPS URL without embedded credentials.')
  }
  const addresses = await lookup(hostname, { all: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Private network addresses are not allowed.')
  }
  return url
}

function send(res: ServerResponse, status: number, payload: object) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

async function relay(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'POST required' })
    return
  }
  try {
    let raw = ''
    for await (const chunk of req) {
      raw += chunk.toString()
      if (raw.length > MAX_REQUEST_BYTES) throw new Error('Request is too large.')
    }
    const input = JSON.parse(raw) as { url?: string; method?: string; headers?: Record<string, string>; body?: string }
    const url = await validateUrl(input.url ?? '')
    const method = input.method?.toUpperCase() === 'GET' ? 'GET' : 'POST'
    const headers = new Headers()
    for (const [key, value] of Object.entries(input.headers ?? {})) {
      if (!/^(host|cookie|connection|content-length|transfer-encoding|proxy-authorization)$/i.test(key) && typeof value === 'string') {
        headers.set(key, value)
      }
    }
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? input.body : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    })
    const reader = response.body?.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.length
        if (length > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          throw new Error('The API response is too large (500 KB limit).')
        }
        chunks.push(value)
      }
    }
    const body = new TextDecoder().decode(Buffer.concat(chunks))
    send(res, 200, { status: response.status, body })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    send(res, 400, { error: message === 'fetch failed' ? 'Could not reach the remote API from this preview server. Check the URL and network access.' : message })
  }
}

const apiRelay: Plugin = {
  name: 'orbit-api-relay',
  configureServer(server) {
    server.middlewares.use('/api/relay', (req, res) => { void relay(req, res) })
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/relay', (req, res) => { void relay(req, res) })
  },
}

export default defineConfig({
  plugins: [react(), apiRelay],
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
})
