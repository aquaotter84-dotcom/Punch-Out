import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ToolApprovalDialog } from '../dialogs'
import { initialWorkspace, loadWorkspace, saveWorkspace } from '../storage'
import type { Integration } from '../types'

describe('Orbit workspace', () => {
  it('starts with an honest example workspace and persistent memories', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Meet your agents' })).toBeInTheDocument()
    expect(screen.getByText(/example agents/)).toBeInTheDocument()
    expect(loadWorkspace().agents).toHaveLength(3)
    expect(loadWorkspace().memories).toHaveLength(5)
  })

  it('lets keyboard users dismiss the creation dialog and returns focus to its trigger', async () => {
    const user = userEvent.setup()
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'New agent' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Create an agent' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('creates an agent, saves it, and shows a clearly labeled preview without an AI key', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'New agent' }))
    const editor = screen.getByRole('dialog', { name: 'Create an agent' })
    await user.type(within(editor).getByPlaceholderText('e.g. Atlas'), 'Nova')
    await user.type(within(editor).getByPlaceholderText('e.g. Research assistant'), 'Planning partner')
    await user.type(within(editor).getByPlaceholderText(/Tell your agent how to think/), 'Help me plan projects in clear steps.')
    await user.click(within(editor).getByRole('button', { name: /Create agent/ }))
    expect(screen.getByRole('heading', { level: 1, name: /Nova/ })).toBeInTheDocument()
    expect(loadWorkspace().agents.some(agent => agent.name === 'Nova')).toBe(true)

    await user.click(screen.getByRole('button', { name: /Run agent/ }))
    const composer = screen.getByRole('dialog', { name: 'Give Nova a task' })
    await user.type(within(composer).getByPlaceholderText('Help me make a plan for...'), 'Plan a small launch')
    await user.click(within(composer).getByRole('button', { name: 'Try preview run' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Preview run' })).toBeInTheDocument())
    expect(screen.getByText(/no AI request was made/)).toBeInTheDocument()
    expect(loadWorkspace().runs[0].status).toBe('preview')
  })

  it('guides a first-time user from a starter template to a suggested task', async () => {
    const user = userEvent.setup()
    render(<App />)
    const guide = screen.getByRole('region', { name: 'Getting started' })
    expect(within(guide).getByText('0 of 3 done')).toBeInTheDocument()
    await user.click(within(guide).getByRole('button', { name: 'Step 1: Make your first helper' }))
    const editor = screen.getByRole('dialog', { name: 'Create an agent' })
    await user.click(within(editor).getByRole('button', { name: /Research Find clear answers/ }))
    expect(within(editor).getByPlaceholderText('e.g. Atlas')).toHaveValue('Sage')
    expect(within(editor).getByPlaceholderText('e.g. Research assistant')).toHaveValue('Research assistant')
    expect(within(editor).queryByText('Run schedule')).not.toBeInTheDocument()
    await user.click(within(editor).getByRole('button', { name: /Make it your own/ }))
    expect(within(editor).getByText('Run schedule')).toBeInTheDocument()
    await user.click(within(editor).getByRole('button', { name: /Create agent/ }))
    expect(screen.getByRole('heading', { level: 1, name: /Sage/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Run agent/ }))
    const composer = screen.getByRole('dialog', { name: 'Give Sage a task' })
    await user.click(within(composer).getByRole('button', { name: /Compare two options for my next project/ }))
    expect(within(composer).getByPlaceholderText('Research the pros and cons of a new idea...')).toHaveValue('Compare two options for my next project')
  })

  it('adds and pins a memory for an agent', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Memory' })[0])
    await user.click(screen.getByRole('button', { name: 'Add memory' }))
    const editor = screen.getByRole('dialog', { name: 'Add a memory' })
    await user.type(within(editor).getByPlaceholderText(/I like concise updates/), 'Always include the sources you used.')
    await user.click(within(editor).getByText('Pin this memory so it\'s prioritized'))
    await user.click(within(editor).getByRole('button', { name: 'Save memory' }))
    expect(screen.getByText('Always include the sources you used.')).toBeInTheDocument()
    expect(loadWorkspace().memories.find(memory => memory.content === 'Always include the sources you used.')?.pinned).toBe(true)
  })

  it('keeps the technical endpoint out of the beginner setup until requested', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    expect(screen.queryByPlaceholderText('https://api.example.com/v1/chat/completions')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Advanced: change the API endpoint/ }))
    expect(screen.getByPlaceholderText('https://api.example.com/v1/chat/completions')).toBeInTheDocument()
  })

  it('keeps the provider key in session storage, outside workspace backups', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.type(screen.getByPlaceholderText('Enter your API key'), 'private-test-key')
    await user.click(screen.getByRole('button', { name: /Save settings/ }))
    expect(sessionStorage.getItem('orbit-ai-key-session')).toBe('private-test-key')
    expect(localStorage.getItem('orbit-workspace-v1')).not.toContain('private-test-key')
  })

  it('sets up web search with a simple key field instead of raw HTTP headers', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Integrations' }))
    await user.click(screen.getByRole('button', { name: /Web search/ }))
    const editor = screen.getByRole('dialog', { name: 'Connect Web search' })
    expect(within(editor).getByPlaceholderText('Paste your Tavily API key')).toBeInTheDocument()
    expect(within(editor).queryByText('Request headers')).not.toBeInTheDocument()
    await user.type(within(editor).getByPlaceholderText('Paste your Tavily API key'), 'tvly-example')
    await user.click(within(editor).getByRole('button', { name: /Connect tool/ }))
    expect(loadWorkspace().integrations[0].headers.Authorization).toBe('Bearer tvly-example')
    expect(loadWorkspace().integrations[0].requireApproval).toBe(true)
  })

  it('asks before a POST test request and keeps the editor open when approval is dismissed', async () => {
    const user = userEvent.setup()
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Integrations' }))
    await user.click(screen.getByRole('button', { name: /Web search/ }))
    const editor = screen.getByRole('dialog', { name: 'Connect Web search' })
    await user.type(within(editor).getByPlaceholderText('Paste your Tavily API key'), 'test-key')
    await user.click(within(editor).getByRole('button', { name: /Send test request/ }))
    expect(screen.getByRole('dialog', { name: 'Send a test request?' })).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Send a test request?' })).not.toBeInTheDocument()
    expect(editor).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()
  })

  it('holds run suggestions for review before they become agent memory', async () => {
    const workspace = initialWorkspace()
    workspace.runs.unshift({ id: 'review-1', agentId: 'atlas', goal: 'Compare two options', output: 'Option A is simpler.', status: 'completed', source: 'manual', createdAt: new Date().toISOString(), steps: [], suggestedMemory: 'Option A looks simpler.', memoryReview: 'pending' })
    workspace.runs.unshift({ id: 'review-2', agentId: 'piper', goal: 'Draft a letter', output: 'Hello!', status: 'completed', source: 'manual', createdAt: new Date().toISOString(), steps: [], suggestedMemory: 'Letter draft: Hello!', memoryReview: 'pending' })
    saveWorkspace(workspace)
    const user = userEvent.setup()
    render(<App />)
    expect(loadWorkspace().memories).toHaveLength(5)
    await user.click(screen.getAllByRole('button', { name: /^Memory/ })[0])
    expect(screen.getByRole('heading', { name: 'For your review (2)' })).toBeInTheDocument()
    const atlasCard = screen.getByRole('textbox', { name: 'Suggested memory for Atlas' }).closest('.memory-review-card') as HTMLElement
    await user.clear(within(atlasCard).getByRole('textbox'))
    await user.type(within(atlasCard).getByRole('textbox'), 'I prefer simple options.')
    await user.click(within(atlasCard).getByRole('button', { name: /Save memory/ }))
    await waitFor(() => expect(loadWorkspace().memories[0].content).toBe('I prefer simple options.'))
    expect(loadWorkspace().runs.find(run => run.id === 'review-1')?.memoryReview).toBe('saved')
    const piperCard = screen.getByRole('textbox', { name: 'Suggested memory for Piper' }).closest('.memory-review-card') as HTMLElement
    await user.click(within(piperCard).getByRole('button', { name: /Don't save/ }))
    expect(loadWorkspace().runs.find(run => run.id === 'review-2')?.memoryReview).toBe('dismissed')
    expect(loadWorkspace().memories).toHaveLength(6)
  })

  it('shows the exact destination and request body before allowing a sensitive tool', async () => {
    const tool: Integration = { id: 'hook', name: 'Team webhook', description: 'Send notes', icon: 'webhook', method: 'POST', url: 'https://hooks.example.com/updates', headers: { Authorization: 'Bearer super-secret', 'Content-Type': 'application/json' }, bodyTemplate: '{"text":"{{input}}"}', enabled: true, createdAt: new Date().toISOString() }
    const decide = vi.fn()
    const user = userEvent.setup()
    render(<ToolApprovalDialog tool={tool} input="Private launch notes" agentName="Atlas" onDecision={decide} />)
    const dialog = screen.getByRole('dialog', { name: 'Allow this tool request?' })
    expect(within(dialog).getByText('hooks.example.com')).toBeInTheDocument()
    expect(within(dialog).getByText('{"text":"Private launch notes"}')).toBeInTheDocument()
    expect(within(dialog).queryByText(/super-secret/)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Allow once' }))
    expect(decide).toHaveBeenCalledWith(true)
  })

  it('pauses a real run for permission and does not call a rejected webhook', async () => {
    const workspace = initialWorkspace()
    workspace.integrations.push({ id: 'hook', name: 'Team webhook', description: 'Send notes to the team', icon: 'webhook', url: 'https://hooks.example.com/updates', method: 'POST', headers: { 'Content-Type': 'application/json' }, bodyTemplate: '{"message":"{{input}}"}', enabled: true, createdAt: new Date().toISOString() })
    workspace.agents[0].toolIds = ['hook']
    saveWorkspace(workspace)
    sessionStorage.setItem('orbit-ai-key-session', 'test-key')
    const requests: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      const request = JSON.parse(options.body as string) as { url: string; body: string }
      requests.push(request.url)
      const messages = (JSON.parse(request.body) as { messages: Array<{ role: string }> }).messages
      const completion = messages.some(message => message.role === 'tool')
        ? { choices: [{ message: { role: 'assistant', content: 'I did not send that note.' } }] }
        : { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'tool_hook', arguments: '{"input":"Private launch notes"}' } }] } }] }
      return new Response(JSON.stringify({ status: 200, body: JSON.stringify(completion) }), { status: 200 })
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Ready Atlas Research assistant/ }))
    await user.click(screen.getByRole('button', { name: /Run agent/ }))
    const composer = screen.getByRole('dialog', { name: 'Give Atlas a task' })
    await user.type(within(composer).getByPlaceholderText('Research the pros and cons of a new idea...'), 'Send an update')
    await user.click(within(composer).getByRole('button', { name: 'Run agent' }))
    const approval = await screen.findByRole('dialog', { name: 'Allow this tool request?' })
    expect(requests).toEqual([workspace.settings.endpoint])
    expect(within(approval).getByText('Private launch notes')).toBeInTheDocument()
    await user.click(within(approval).getByRole('button', { name: "Don't allow" }))
    await waitFor(() => expect(loadWorkspace().runs[0].status).toBe('completed'))
    expect(requests).toEqual([workspace.settings.endpoint, workspace.settings.endpoint])
    expect(loadWorkspace().memories).toHaveLength(5)
    expect(loadWorkspace().runs[0].memoryReview).toBe('pending')
  })

  it('connects a custom HTTPS API tool', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Integrations' }))
    await user.click(screen.getByRole('button', { name: 'Add custom API' }))
    const editor = screen.getByRole('dialog', { name: 'Connect a custom API' })
    await user.type(within(editor).getByPlaceholderText('e.g. Weather API'), 'Weather service')
    await user.type(within(editor).getByPlaceholderText('Describe when the agent should use this API'), 'Get the current weather for a city')
    fireEvent.change(within(editor).getByPlaceholderText('https://api.example.com/endpoint'), { target: { value: 'https://weather.example.com/search?q={{input}}' } })
    await user.click(within(editor).getByRole('button', { name: /Connect tool/ }))
    expect(screen.getByText('Weather service')).toBeInTheDocument()
    expect(loadWorkspace().integrations[0].url).toContain('{{input}}')
    expect(loadWorkspace().integrations[0].requireApproval).toBe(false)
  })
})
