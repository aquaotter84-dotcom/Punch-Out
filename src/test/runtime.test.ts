import { describe, expect, it, vi } from 'vitest'
import { chatWithAgent, executeAgent, toolNeedsApproval } from '../runtime'
import { initialWorkspace } from '../storage'
import type { Integration, Memory, RunStep } from '../types'

describe('agent runtime', () => {
  it('passes persistent memory to the model, calls an assigned tool, and returns the final answer', async () => {
    const workspace = initialWorkspace()
    const tool: Integration = {
      id: 'weather', name: 'Weather', description: 'Look up current weather', icon: 'globe',
      url: 'https://weather.example.com/lookup', method: 'POST', headers: { 'Content-Type': 'application/json' },
      bodyTemplate: '{"city":"{{input}}"}', enabled: true, createdAt: new Date().toISOString(),
    }
    const memory: Memory = { id: 'memory', agentId: 'atlas', content: 'I live in Seattle.', kind: 'fact', pinned: true, source: 'manual', createdAt: new Date().toISOString() }
    const forwarded: Array<{ url: string; body: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
      // requestExternal tries a direct browser request first and falls back to /api/relay.
      const raw = JSON.parse(options.body as string) as { url?: string; body?: string; messages?: Array<{ role: string }> }
      const isRelay = typeof url === 'string' && url.endsWith('/api/relay')
      const request = { url: isRelay ? raw.url! : url, body: isRelay ? raw.body! : (options.body as string) }
      forwarded.push(request)
      let responseBody: object | string
      if (request.url.includes('weather.example.com')) {
        responseBody = '{"temperature":19,"condition":"sunny"}'
      } else {
        const body = JSON.parse(request.body) as { messages: Array<{ role: string }> }
        responseBody = body.messages.some(message => message.role === 'tool')
          ? { choices: [{ message: { role: 'assistant', content: 'It is sunny and 19°C in Seattle.' } }] }
          : { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'tool_weather', arguments: '{"input":"Seattle"}' } }] } }] }
      }
      const text = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
      return new Response(isRelay ? JSON.stringify({ status: 200, body: text }) : text, { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))
    const steps: RunStep[] = []
    const approve = vi.fn(async () => true)
    const output = await executeAgent({
      agent: workspace.agents[0], goal: 'What is the weather?', memories: [memory], tools: [tool],
      settings: workspace.settings, apiKey: 'test-key', onStep: step => steps.push(step), onApproval: approve,
    })
    expect(approve).toHaveBeenCalledWith(tool, 'Seattle')
    expect(output).toContain('sunny')
    expect(forwarded).toHaveLength(3)
    expect(forwarded[0].body).toContain('I live in Seattle.')
    expect(forwarded[1].body).toBe('{"city":"Seattle"}')
    expect(steps.some(step => step.label === 'Used Weather')).toBe(true)
  })

  it('skips a POST tool if approval is denied or no approval handler is available', async () => {
    const workspace = initialWorkspace()
    const tool: Integration = { id: 'hook', name: 'Hook', description: 'Send a message', icon: 'webhook', url: 'https://example.com/hook', method: 'POST', headers: {}, bodyTemplate: '{{input}}', enabled: true, createdAt: new Date().toISOString() }
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
      // requestExternal tries a direct browser request first and falls back to /api/relay.
      const raw = JSON.parse(options.body as string) as { url?: string; body?: string; messages?: Array<{ role: string }> }
      const isRelay = typeof url === 'string' && url.endsWith('/api/relay')
      urls.push(isRelay ? raw.url! : url)
      const messages = ((isRelay ? JSON.parse(raw.body!) : raw) as { messages: Array<{ role: string }> }).messages
      const answer = messages.some(message => message.role === 'tool')
        ? { choices: [{ message: { role: 'assistant', content: 'I did not send anything.' } }] }
        : { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'tool_hook', arguments: '{"input":"Private note"}' } }] } }] }
      const text = JSON.stringify(answer)
      return new Response(isRelay ? JSON.stringify({ status: 200, body: text }) : text, { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))
    const steps: RunStep[] = []
    const input = { agent: workspace.agents[0], goal: 'Send a note', memories: [], tools: [tool], settings: workspace.settings, apiKey: 'test-key', onStep: (step: RunStep) => steps.push(step) }
    expect(toolNeedsApproval(tool)).toBe(true) // Protect existing POST tools without a saved flag.
    expect(await executeAgent({ ...input, onApproval: async () => false })).toContain('did not send')
    expect(await executeAgent(input)).toContain('did not send')
    expect(urls).toEqual(Array(4).fill(workspace.settings.endpoint))
    expect(steps.filter(step => step.label === 'Skipped Hook')).toHaveLength(2)
    expect(toolNeedsApproval({ ...tool, method: 'GET' })).toBe(false)
    expect(toolNeedsApproval({ ...tool, requireApproval: false })).toBe(false)
  })

  it('escapes user input when inserting it into a JSON body', async () => {
    const { callIntegration } = await import('../runtime')
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      const request = JSON.parse(options.body as string) as { body: string }
      expect(JSON.parse(request.body)).toEqual({ text: 'Say "hello"\nagain' })
      return new Response(JSON.stringify({ status: 200, body: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))
    const tool: Integration = { id: 'hook', name: 'Hook', description: 'Post text', icon: 'webhook', url: 'https://example.com/hook', method: 'POST', headers: { 'Content-Type': 'application/json' }, bodyTemplate: '{"text":"{{input}}"}', enabled: true, createdAt: new Date().toISOString() }
    expect(await callIntegration(tool, 'Say "hello"\nagain')).toBe('ok')
  })

  it('chats with conversation history and asks permission before a POST tool', async () => {
    const workspace = initialWorkspace()
    const tool: Integration = { id: 'notes', name: 'Notes', description: 'Save a note', icon: 'webhook', url: 'https://notes.example.com/save', method: 'POST', headers: {}, bodyTemplate: '{{input}}', enabled: true, createdAt: new Date().toISOString() }
    const completions: Array<{ messages: Array<{ role: string; content: string | null }> }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
      // requestExternal tries a direct browser request first and falls back to /api/relay.
      const raw = JSON.parse(options.body as string) as { url?: string; body?: string }
      const isRelay = typeof url === 'string' && url.endsWith('/api/relay')
      const target = isRelay ? raw.url! : url
      let text: string
      if (target.includes('notes.example.com')) {
        text = 'Note saved.'
      } else {
        const payload = (isRelay ? JSON.parse(raw.body!) : raw) as { messages: Array<{ role: string; content: string | null }> }
        completions.push(payload)
        text = JSON.stringify(payload.messages.some(message => message.role === 'tool')
          ? { choices: [{ message: { role: 'assistant', content: 'Saved that note for you.' } }] }
          : { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'tool_notes', arguments: '{"input":"Buy milk"}' } }] } }] })
      }
      return new Response(isRelay ? JSON.stringify({ status: 200, body: text }) : text, { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))
    const approve = vi.fn(async () => true)
    const reply = await chatWithAgent({
      agent: workspace.agents[0],
      history: [
        { role: 'user', content: 'Hi Atlas' },
        { role: 'assistant', content: 'Hello! What can I do for you?' },
        { role: 'user', content: 'Remember to buy milk' },
      ],
      memories: [], tools: [tool],
      settings: workspace.settings, apiKey: 'test-key', onApproval: approve,
    })
    expect(reply).toContain('Saved that note')
    expect(approve).toHaveBeenCalledWith(tool, 'Buy milk')
    // The full conversation thread reaches the model: system prompt plus every turn.
    expect(completions[0].messages.map(message => message.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(completions[0].messages[1].content).toBe('Hi Atlas')
    expect(completions[0].messages[0].content).toContain('Atlas')
  })
})
