import { useState, type FormEvent } from 'react'
import { Activity, ArrowRight, ArrowUpRight, Bot, Brain, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Code2, Globe2, KeyRound, Link2, LoaderCircle, Mail, PenLine, Pin, Play, Radar, Search, ShieldCheck, Sparkles, Trash2, Wrench, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useOrbit } from './context'
import { callIntegration, prepareIntegrationRequest, toolNeedsApproval } from './runtime'
import { MemoryReviewCard } from './MemoryReviewCard'
import { AgentAvatar, Modal, ToolAvatar, fullDate, timeAgo } from './ui'
import { newId, type Agent, type AgentColor, type AgentIcon, type Integration, type Memory } from './types'

const iconChoices: { id: AgentIcon; icon: typeof Sparkles; label: string }[] = [
  { id: 'sparkles', icon: Sparkles, label: 'Sparkles' }, { id: 'search', icon: Search, label: 'Search' },
  { id: 'pen', icon: PenLine, label: 'Write' }, { id: 'radar', icon: Radar, label: 'Radar' },
  { id: 'code', icon: Code2, label: 'Code' }, { id: 'mail', icon: Mail, label: 'Mail' },
]
const colors: AgentColor[] = ['lavender', 'mint', 'peach', 'blue', 'yellow']

const agentStarters: Array<{
  id: string; label: string; summary: string; icon: typeof Search;
  name: string; role: string; description: string; instructions: string;
  agentIcon: AgentIcon; color: AgentColor
}> = [
  {
    id: 'research', label: 'Research', summary: 'Find clear answers', icon: Search,
    name: 'Sage', role: 'Research assistant', description: 'Finds useful information and turns it into a clear summary.',
    instructions: 'Research carefully, distinguish facts from assumptions, share sources when available, and end with practical takeaways. If you cannot verify something, say so.',
    agentIcon: 'search', color: 'lavender',
  },
  {
    id: 'writing', label: 'Writing', summary: 'Make words flow', icon: PenLine,
    name: 'Quill', role: 'Writing partner', description: 'Helps turn rough ideas into clear, engaging writing.',
    instructions: 'Write in a warm, natural voice. Keep the meaning intact, avoid jargon, and offer a strong opening. Ask for missing context instead of inventing details.',
    agentIcon: 'pen', color: 'peach',
  },
  {
    id: 'planning', label: 'Planning', summary: 'Get organized', icon: Radar,
    name: 'Milo', role: 'Planning partner', description: 'Breaks big goals into small, doable next steps.',
    instructions: 'Help me make realistic plans with clear priorities, short action steps, and sensible timelines. Point out dependencies and suggest the next best step.',
    agentIcon: 'radar', color: 'mint',
  },
]

export function AgentEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { workspace, setWorkspace, openAgent, toast, navigate } = useOrbit()
  const existing = workspace.agents.find(agent => agent.id === id)
  const isNew = !existing
  const [form, setForm] = useState<Agent>(existing ?? {
    id: newId(), name: '', role: '', description: '', instructions: '', icon: 'sparkles', color: 'lavender',
    schedule: 'manual', recurringGoal: '', enabled: true, toolIds: [], createdAt: new Date().toISOString(),
  })
  const [error, setError] = useState('')
  const [selectedStarter, setSelectedStarter] = useState('custom')
  const [showAdvanced, setShowAdvanced] = useState(!isNew)
  const update = (changes: Partial<Agent>) => { setForm(current => ({ ...current, ...changes })); setError('') }
  function chooseStarter(id: string) {
    const starter = agentStarters.find(item => item.id === id)
    const previous = agentStarters.find(item => item.id === selectedStarter)
    setForm(current => {
      const keepName = Boolean(current.name.trim() && current.name !== previous?.name)
      return starter ? {
        ...current,
        name: keepName ? current.name : starter.name,
        role: starter.role, description: starter.description, instructions: starter.instructions,
        icon: starter.agentIcon, color: starter.color,
      } : {
        ...current,
        name: keepName ? current.name : '', role: '', description: '', instructions: '', icon: 'sparkles', color: 'lavender',
      }
    })
    setSelectedStarter(id)
    setError('')
  }
  function save(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.role.trim() || !form.instructions.trim()) { setError('Name, role, and instructions are required.'); return }
    if (form.schedule !== 'manual' && !form.recurringGoal.trim()) { setError('Add a recurring goal for scheduled runs.'); return }
    const next = { ...form, name: form.name.trim(), role: form.role.trim(), description: form.description.trim(), instructions: form.instructions.trim(), recurringGoal: form.recurringGoal.trim() }
    setWorkspace(current => ({ ...current, agents: isNew ? [...current.agents, next] : current.agents.map(agent => agent.id === id ? next : agent) }))
    onClose(); openAgent(next.id); toast(isNew ? `${next.name} joined your team` : `${next.name} updated`)
  }
  function remove() {
    if (!existing || !window.confirm(`Delete ${existing.name}? Its memories and run history will also be removed. This cannot be undone.`)) return
    setWorkspace(current => ({ ...current, agents: current.agents.filter(agent => agent.id !== id), memories: current.memories.filter(memory => memory.agentId !== id), runs: current.runs.filter(run => run.agentId !== id) }))
    onClose(); navigate('agents'); toast(`${existing.name} deleted`)
  }
  return <Modal title={isNew ? 'Create an agent' : `Edit ${existing.name}`} subtitle={isNew ? 'Give your new teammate a name and a purpose.' : 'A few small changes can make a big difference.'} onClose={onClose} wide className="editor-modal">
    <form onSubmit={save} className="editor-form">
      {isNew && <div className="starter-section"><div className="starter-section-heading"><span className="form-section-title">START WITH WHAT YOU NEED</span><p>Pick a starting point. Everything is yours to change.</p></div><div className="starter-grid">
        {agentStarters.map(starter => <button type="button" key={starter.id} autoFocus={starter.id === 'research'} className={`starter-choice ${selectedStarter === starter.id ? 'starter-choice--selected' : ''}`} aria-pressed={selectedStarter === starter.id} onClick={() => chooseStarter(starter.id)}><span className="starter-choice-icon"><starter.icon size={20} /></span><strong>{starter.label}</strong><small>{starter.summary}</small></button>)}
        <button type="button" className={`starter-choice ${selectedStarter === 'custom' ? 'starter-choice--selected' : ''}`} aria-pressed={selectedStarter === 'custom'} onClick={() => chooseStarter('custom')}><span className="starter-choice-icon"><Sparkles size={20} /></span><strong>My own idea</strong><small>Start from scratch</small></button>
      </div></div>}
      <div className="agent-editor-preview"><AgentAvatar agent={form} size="large" /><div><strong>{form.name || 'Your new agent'}</strong><span>{form.role || 'A little help, made just for you'}</span></div><span className="agent-status"><span />{form.enabled ? 'Ready' : 'Paused'}</span></div>
      <div className="form-section-title">THE BASICS</div><div className="form-row"><label className="field"><span>Agent name <b>*</b></span><input value={form.name} onChange={event => update({ name: event.target.value })} placeholder="e.g. Atlas" maxLength={32} autoFocus={!isNew} /></label><label className="field"><span>Role <b>*</b></span><input value={form.role} onChange={event => update({ role: event.target.value })} placeholder="e.g. Research assistant" maxLength={60} /></label></div>
      <label className="field"><span>Short description</span><input value={form.description} onChange={event => update({ description: event.target.value })} placeholder="What does this agent help you with?" maxLength={180} /></label>
      <label className="field"><span>Instructions <b>*</b></span><textarea rows={4} value={form.instructions} onChange={event => update({ instructions: event.target.value })} placeholder="Tell your agent how to think, what to prioritize, and how to respond..." /><small>These instructions guide your agent every time it runs.</small></label>
      <button type="button" className={`advanced-toggle ${showAdvanced ? 'advanced-toggle--open' : ''}`} aria-expanded={showAdvanced} onClick={() => setShowAdvanced(value => !value)}><span className="advanced-toggle-icon"><Wrench size={18} /></span><span><strong>{showAdvanced ? 'Hide extra options' : 'Make it your own'}</strong><small>Appearance, schedule, and connected tools</small></span><ChevronDown size={18} /></button>
      {showAdvanced && <>
      <div className="form-section-title">MAKE IT YOURS</div><div className="appearance-row"><div><span className="field-title">Choose an icon</span><div className="icon-picker">{iconChoices.map(({ id: iconId, icon: Icon, label }) => <button key={iconId} type="button" title={label} aria-label={label} aria-pressed={form.icon === iconId} className={form.icon === iconId ? 'selected' : ''} onClick={() => update({ icon: iconId })}><Icon size={19} /></button>)}</div></div><div><span className="field-title">Choose a color</span><div className="color-picker">{colors.map(color => <button key={color} type="button" className={`color-dot color-dot--${color} ${form.color === color ? 'selected' : ''}`} onClick={() => update({ color })} aria-label={`${color} color`} aria-pressed={form.color === color}>{form.color === color && <Check size={14} />}</button>)}</div></div></div>
      <div className="form-section-title">HOW IT WORKS</div><div className="field"><span>Run schedule</span><div className="schedule-picker">{([['manual', 'On demand', 'Run it yourself'], ['hourly', 'Hourly', 'Scheduled task'], ['daily', 'Daily', 'Scheduled task']] as const).map(([value, label, description]) => <button key={value} type="button" className={form.schedule === value ? 'selected' : ''} aria-pressed={form.schedule === value} onClick={() => update({ schedule: value })}><span className="schedule-radio" /><strong>{label}</strong><small>{description}</small></button>)}</div></div>
      {form.schedule !== 'manual' && <label className="field"><span>Recurring goal <b>*</b></span><textarea rows={2} value={form.recurringGoal} onChange={event => update({ recurringGoal: event.target.value })} placeholder="What should this agent work on each time?" /><small>Runs while Orbit is open; on Android, enable background runs in Settings to work when closed. Timing is approximate and connected tools are never used unattended.</small></label>}
      <div className="field"><span>Connected tools <small>OPTIONAL</small></span>{workspace.integrations.length ? <div className="tool-picker">{workspace.integrations.map(tool => <label key={tool.id}><input type="checkbox" checked={form.toolIds.includes(tool.id)} onChange={() => update({ toolIds: form.toolIds.includes(tool.id) ? form.toolIds.filter(item => item !== tool.id) : [...form.toolIds, tool.id] })} /><ToolAvatar icon={tool.icon} size="small" /><span><strong>{tool.name}</strong><small>{tool.description}</small></span><span className="tool-picker-check"><Check size={14} /></span></label>)}</div> : <div className="no-tools-inline"><Link2 size={18} />No tools connected yet. <button type="button" onClick={() => { onClose(); navigate('integrations') }}>Explore integrations <ArrowRight size={14} /></button></div>}</div>
      {!isNew && <label className="switch-row"><span><strong>Agent is active</strong><small>Paused agents won't run scheduled tasks.</small></span><input type="checkbox" checked={form.enabled} onChange={event => update({ enabled: event.target.checked })} /><span className="switch-track" /></label>}
      </>}
      {error && <p className="form-error"><CircleAlert size={15} />{error}</p>}
      <div className="modal-footer">{!isNew && <button type="button" className="delete-button" onClick={remove}><Trash2 size={16} /> Delete agent</button>}<span className="footer-spacer" /><button type="button" className="button button--outline" onClick={onClose}>Cancel</button><button type="submit" className="button button--dark">{isNew ? 'Create agent' : 'Save changes'} <ArrowRight size={17} /></button></div>
    </form>
  </Modal>
}

export function MemoryEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { workspace, setWorkspace, selectedAgentId, toast } = useOrbit()
  const existing = workspace.memories.find(memory => memory.id === id)
  const isNew = !existing
  const [form, setForm] = useState<Memory>(existing ?? { id: newId(), agentId: selectedAgentId ?? workspace.agents[0]?.id ?? '', content: '', kind: 'fact', pinned: false, source: 'manual', createdAt: new Date().toISOString() })
  const [error, setError] = useState('')
  function save(event: FormEvent) {
    event.preventDefault()
    if (!form.agentId || !form.content.trim()) { setError('Choose an agent and add something to remember.'); return }
    const next = { ...form, content: form.content.trim(), source: existing?.source === 'run' ? 'run' as const : 'manual' as const }
    setWorkspace(current => ({ ...current, memories: isNew ? [next, ...current.memories] : current.memories.map(memory => memory.id === id ? next : memory) }))
    onClose(); toast(isNew ? 'Memory saved' : 'Memory updated')
  }
  function remove() {
    if (!existing || !window.confirm('Delete this memory? This cannot be undone.')) return
    setWorkspace(current => ({ ...current, memories: current.memories.filter(memory => memory.id !== id) }))
    onClose(); toast('Memory deleted')
  }
  return <Modal title={isNew ? 'Add a memory' : 'Edit memory'} subtitle="A little context helps your agent understand you better." onClose={onClose} className="memory-modal"><form className="editor-form" onSubmit={save}>
    <label className="field"><span>What should your agent remember?</span><textarea rows={5} autoFocus value={form.content} onChange={event => { setForm(current => ({ ...current, content: event.target.value })); setError('') }} placeholder="e.g. I like concise updates with clear next steps..." /><small>Be specific. This will be included in your agent's context on real runs.</small></label>
    <div className="form-row"><label className="field"><span>Remember for</span><select value={form.agentId} onChange={event => setForm(current => ({ ...current, agentId: event.target.value }))}>{workspace.agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label><label className="field"><span>Type</span><select value={form.kind} onChange={event => setForm(current => ({ ...current, kind: event.target.value as Memory['kind'] }))}><option value="fact">Fact</option><option value="preference">Preference</option><option value="insight">Insight</option></select></label></div>
    <label className="checkbox-line"><input type="checkbox" checked={form.pinned} onChange={event => setForm(current => ({ ...current, pinned: event.target.checked }))} /><Pin size={16} /> Pin this memory so it's prioritized</label>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-footer">{!isNew && <button type="button" className="delete-button" onClick={remove}><Trash2 size={16} /> Delete</button>}<span className="footer-spacer" /><button type="button" className="button button--outline" onClick={onClose}>Cancel</button><button type="submit" className="button button--dark">Save memory <ArrowRight size={16} /></button></div>
  </form></Modal>
}

export function ToolApprovalDialog({ tool, input, agentName, purpose = 'agent', onDecision }: {
  tool: Integration; input: string; agentName?: string; purpose?: 'agent' | 'test'; onDecision: (allowed: boolean) => void
}) {
  let request: ReturnType<typeof prepareIntegrationRequest> | null = null
  let problem = ''
  try {
    request = prepareIntegrationRequest(tool, input)
    const destination = new URL(request.url)
    if (destination.protocol !== 'https:' || destination.username || destination.password) throw new Error('This tool needs a secure HTTPS destination without embedded credentials.')
  } catch (error) { request = null; problem = error instanceof Error ? error.message : 'This tool has an invalid destination.' }
  return <Modal title={purpose === 'test' ? 'Send a test request?' : 'Allow this tool request?'} subtitle={purpose === 'test' ? `Your test will contact ${tool.name}.` : `${agentName ?? 'Your agent'} wants to use ${tool.name}.`} onClose={() => onDecision(false)} className="tool-approval-modal" priority>
    <div className="approval-destination"><span className="approval-destination-icon"><ShieldCheck size={24} /></span><div><small>BEFORE ANYTHING IS SENT</small><strong>Check where your information is going</strong></div></div>
    <div className="approval-summary"><span className={`approval-method approval-method--${tool.method.toLowerCase()}`}>{tool.method}</span><span>{request ? new URL(request.url).hostname : 'Invalid destination'}</span></div>
    <div className="approval-detail"><strong>Destination URL</strong><code>{request?.url ?? tool.url}</code></div>
    <div className="approval-detail"><strong>Input provided by the agent</strong><pre>{input || '(empty input)'}</pre></div>
    {request?.body && <div className="approval-detail"><strong>Request body</strong><pre>{request.body}</pre></div>}
    {request && Object.keys(request.headers ?? {}).length > 0 && <p className="approval-headers">Configured headers will also be sent ({Object.keys(request.headers ?? {}).join(', ')}). Their values are hidden here.</p>}
    <p className="approval-warning"><CircleAlert size={17} />{tool.method === 'POST' ? 'This request could change data or trigger an action at the destination. ' : 'This request may share private details with the destination. '}Approval is for this one request only.</p>
    {problem && <p className="form-error">{problem}</p>}
    <div className="modal-footer"><button className="button button--outline" onClick={() => onDecision(false)}>Don't allow</button><button className="button button--dark" disabled={!request} onClick={() => onDecision(true)}><ShieldCheck size={16} /> {purpose === 'test' ? 'Send test once' : 'Allow once'}</button></div>
  </Modal>
}

const toolTemplates: Record<string, Omit<Integration, 'id' | 'createdAt'>> = {
  tavily: { name: 'Web search', description: 'Search the live web for current information using Tavily.', icon: 'search', url: 'https://api.tavily.com/search', method: 'POST', headers: { Authorization: 'Bearer YOUR_TAVILY_KEY', 'Content-Type': 'application/json' }, bodyTemplate: '{"query":"{{input}}","search_depth":"basic","max_results":3}', enabled: true },
  slack: { name: 'Slack', description: 'Send a message to a Slack channel via an incoming webhook.', icon: 'slack', url: '', method: 'POST', headers: { 'Content-Type': 'application/json' }, bodyTemplate: '{"text":"{{input}}"}', enabled: true },
  webhook: { name: 'Webhook', description: 'Send information to a webhook endpoint.', icon: 'webhook', url: '', method: 'POST', headers: { 'Content-Type': 'application/json' }, bodyTemplate: '{"message":"{{input}}"}', enabled: true },
  custom: { name: '', description: '', icon: 'globe', url: '', method: 'GET', headers: {}, bodyTemplate: '', enabled: true },
}

export function IntegrationEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { workspace, setWorkspace, toast } = useOrbit()
  const existing = workspace.integrations.find(tool => tool.id === id)
  const isNew = !existing
  const template = existing ?? toolTemplates[id] ?? toolTemplates.custom
  const isTavily = id === 'tavily' || (existing?.icon === 'search' && existing.url === 'https://api.tavily.com/search')
  const isSlack = id === 'slack' || existing?.icon === 'slack'
  const isGuided = isTavily || isSlack
  const [showHttpOptions, setShowHttpOptions] = useState(!isGuided)
  const [tavilyKey, setTavilyKey] = useState(() => {
    const value = template.headers.Authorization ?? template.headers.authorization ?? ''
    return value.startsWith('Bearer ') && !value.includes('YOUR_TAVILY_KEY') ? value.slice(7) : ''
  })
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description)
  const [url, setUrl] = useState(template.url)
  const [method, setMethod] = useState<Integration['method']>(template.method)
  const [requireApproval, setRequireApproval] = useState(toolNeedsApproval(template))
  const [pendingTest, setPendingTest] = useState<{ tool: Integration; input: string } | null>(null)
  const [headersText, setHeadersText] = useState(Object.entries(template.headers).map(([key, value]) => `${key}: ${value}`).join('\n'))
  const [bodyTemplate, setBodyTemplate] = useState(template.bodyTemplate)
  const [enabled, setEnabled] = useState(template.enabled)
  const [testInput, setTestInput] = useState('Hello from Orbit')
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  function draft(): Integration {
    if (!name.trim() || !description.trim()) throw new Error('Add a name and a description so your agent knows when to use this tool.')
    let parsed: URL
    try { parsed = new URL(url.trim()) } catch { throw new Error('Enter a valid HTTPS URL.') }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Tools need a secure HTTPS URL without embedded credentials.')
    const headers: Record<string, string> = {}
    for (const line of headersText.split('\n').map(line => line.trim()).filter(Boolean)) {
      const index = line.indexOf(':')
      if (index < 1) throw new Error('Write each header on its own line as Name: value.')
      headers[line.slice(0, index).trim()] = line.slice(index + 1).trim()
    }
    if (isTavily) {
      if (!tavilyKey.trim()) throw new Error('Add your Tavily API key to enable web search.')
      headers.Authorization = `Bearer ${tavilyKey.trim()}`
      headers['Content-Type'] = 'application/json'
    } else if (headersText.includes('YOUR_TAVILY_KEY')) throw new Error('Replace YOUR_TAVILY_KEY with your Tavily API key.')
    if (method === 'POST' && bodyTemplate && (headers['Content-Type'] ?? headers['content-type'] ?? '').includes('application/json')) {
      try { JSON.parse(bodyTemplate.replace(/\{\{\s*(input|query)\s*\}\}/gi, 'example')) }
      catch { throw new Error('Your JSON request body is invalid. Check the quotes and brackets.') }
    }
    return { id: existing?.id ?? newId(), name: name.trim(), description: description.trim(), icon: template.icon, url: url.trim(), method, headers, bodyTemplate, enabled, requireApproval, createdAt: existing?.createdAt ?? new Date().toISOString() }
  }
  function save(event: FormEvent) {
    event.preventDefault()
    try {
      const next = draft()
      setWorkspace(current => ({ ...current, integrations: isNew ? [...current.integrations, next] : current.integrations.map(tool => tool.id === id ? next : tool) }))
      onClose(); toast(isNew ? `${next.name} connected — now assign it to an agent` : `${next.name} updated`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Check your tool configuration.') }
  }
  async function sendTest(tool: Integration, input: string) {
    try {
      setError(''); setTestResult(''); setTesting(true)
      const result = await callIntegration(tool, input)
      setTestResult(result.slice(0, 1500) || 'The API returned an empty response.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Test request failed.') }
    finally { setTesting(false) }
  }
  function test() {
    try {
      const tool = draft()
      if (toolNeedsApproval(tool)) setPendingTest({ tool, input: testInput })
      else void sendTest(tool, testInput)
    } catch (err) { setError(err instanceof Error ? err.message : 'Check your tool configuration.') }
  }
  function setRequestMethod(next: Integration['method']) {
    setMethod(next)
    if (next === 'POST') setRequireApproval(true)
  }
  function remove() {
    if (!existing || !window.confirm(`Remove ${existing.name}? It will also be disconnected from your agents.`)) return
    setWorkspace(current => ({ ...current, integrations: current.integrations.filter(tool => tool.id !== id), agents: current.agents.map(agent => ({ ...agent, toolIds: agent.toolIds.filter(toolId => toolId !== id) })) }))
    onClose(); toast(`${existing.name} removed`)
  }
  return <><Modal title={isNew ? `Connect ${id === 'custom' ? 'a custom API' : template.name}` : `Edit ${existing.name}`} subtitle="Give your agents a way to reach the wider web." onClose={onClose} wide className="editor-modal"><form className="editor-form" onSubmit={save}>
    <div className="integration-editor-intro"><ToolAvatar icon={template.icon} /><div><strong>{name || 'Your new connection'}</strong><span>Only agents you assign this to can use it.</span></div></div>
    <div className={isGuided ? '' : 'form-row'}><label className="field"><span>Tool name <b>*</b></span><input autoFocus={!isGuided} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Weather API" maxLength={50} /></label>{!isGuided && <label className="field"><span>Method</span><select value={method} onChange={event => setRequestMethod(event.target.value as Integration['method'])}><option value="GET">GET</option><option value="POST">POST</option></select></label>}</div>
    <label className="field"><span>What does this tool do? <b>*</b></span><input value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe when the agent should use this API" /><small>Your agent reads this description when deciding whether to call the tool.</small></label>
    {isTavily && <label className="field"><span>Tavily API key <b>*</b></span><input type="password" autoFocus value={tavilyKey} onChange={event => { setTavilyKey(event.target.value); setError('') }} placeholder="Paste your Tavily API key" autoComplete="off" /><small>Find this in your Tavily account. Tool keys are saved on this device without encryption.</small></label>}
    {!isTavily && <label className="field"><span>{isSlack ? 'Slack incoming webhook URL' : 'HTTPS endpoint'} <b>*</b></span><input type="url" autoFocus={isSlack} value={url} onChange={event => setUrl(event.target.value)} placeholder={isSlack ? 'https://hooks.slack.com/services/...' : 'https://api.example.com/endpoint'} /><small>{isSlack ? 'Create an incoming webhook in Slack, then paste its URL here. This URL is saved on this device without encryption.' : <>For GET requests, put <code>{'{{input}}'}</code> in the URL where the query should go.</>}</small></label>}
    {isGuided && <button type="button" className={`advanced-toggle integration-advanced ${showHttpOptions ? 'advanced-toggle--open' : ''}`} aria-expanded={showHttpOptions} onClick={() => setShowHttpOptions(value => !value)}><span className="advanced-toggle-icon"><Wrench size={18} /></span><span><strong>{showHttpOptions ? 'Hide request details' : 'Advanced request details'}</strong><small>Method, body, and optional headers</small></span><ChevronDown size={18} /></button>}
    {(!isGuided || showHttpOptions) && <>
      {isGuided && <label className="field"><span>Method</span><select value={method} onChange={event => setRequestMethod(event.target.value as Integration['method'])}><option value="GET">GET</option><option value="POST">POST</option></select></label>}
      {isTavily && <label className="field"><span>Search endpoint</span><input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://api.tavily.com/search" /></label>}
      {!isTavily && <label className="field"><span>Request headers <small>OPTIONAL</small></span><textarea className="code-input" rows={3} value={headersText} onChange={event => setHeadersText(event.target.value)} placeholder={'Authorization: Bearer your-key\nContent-Type: application/json'} /><small>One per line in <code>Name: value</code> format. Credentials in tool headers are saved on this device.</small></label>}
      {method === 'POST' && <label className="field"><span>Request body <small>OPTIONAL</small></span><textarea className="code-input" rows={4} value={bodyTemplate} onChange={event => setBodyTemplate(event.target.value)} placeholder={'{"message":"{{input}}"}'} /><small>Use <code>{'{{input}}'}</code> where the agent's message should be inserted.</small></label>}
    </>}
    {!isNew && <label className="switch-row"><span><strong>Tool is enabled</strong><small>Disabled tools can't be called by agents.</small></span><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /><span className="switch-track" /></label>}
    <div className="tool-permission-panel"><div className="tool-permission-heading"><ShieldCheck size={20} /><span>Tool permissions</span></div><label className="switch-row"><span><strong>Ask me before every use</strong><small>See the destination and input before an agent sends anything. {method === 'POST' ? 'Recommended for POST requests that can change data.' : 'Useful when searches contain private details.'}</small></span><input type="checkbox" checked={requireApproval} onChange={event => setRequireApproval(event.target.checked)} /><span className="switch-track" /></label><p>Scheduled runs skip connected tools. They never approve requests on your behalf.</p></div>
    <div className="integration-test"><div><strong>Test this connection</strong><small>A test sends a real request to this API. For webhooks, it may trigger an action.</small></div><div><input value={testInput} onChange={event => setTestInput(event.target.value)} placeholder="Test input" /><button type="button" onClick={() => void test()} disabled={testing}>{testing ? <LoaderCircle size={16} className="spin" /> : <ArrowUpRight size={16} />} Send test request</button></div>{testResult && <pre>{testResult}</pre>}</div>
    {error && <p className="form-error"><CircleAlert size={16} />{error}</p>}
    <div className="modal-footer">{!isNew && <button type="button" className="delete-button" onClick={remove}><Trash2 size={16} /> Remove tool</button>}<span className="footer-spacer" /><button type="button" className="button button--outline" onClick={onClose}>Cancel</button><button type="submit" className="button button--dark">{isNew ? 'Connect tool' : 'Save changes'} <ArrowRight size={17} /></button></div>
  </form></Modal>
    {pendingTest && <ToolApprovalDialog tool={pendingTest.tool} input={pendingTest.input} purpose="test" onDecision={allowed => { const request = pendingTest; setPendingTest(null); if (allowed) void sendTest(request.tool, request.input) }} />}
  </>
}

const suggestedTasks: Partial<Record<AgentIcon, string[]>> = {
  search: ['Compare two options for my next project', 'Explain a complex topic in plain English', 'Make a short research brief'],
  pen: ['Draft a friendly welcome email', 'Turn my notes into a short post', 'Help me improve a headline'],
  radar: ['Plan my week in simple steps', 'Help me prioritize my to-do list', 'Break down a big goal'],
}

export function RunComposer({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { workspace, apiKey, startRun, navigate } = useOrbit()
  const agent = workspace.agents.find(item => item.id === agentId)
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')
  if (!agent) return null
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!goal.trim()) { setError('Tell your agent what you would like it to do.'); return }
    void startRun(agentId, goal.trim(), !apiKey)
  }
  return <Modal title={`Give ${agent.name} a task`} subtitle="A clear goal is a great place to start." onClose={onClose} className="run-composer-modal"><form className="editor-form" onSubmit={submit}>
    <div className="run-agent-identity"><AgentAvatar agent={agent} /><span><strong>{agent.name}</strong><small>{agent.role}</small></span><span className="agent-status"><span />Ready</span></div>
    <label className="field"><span>What would you like {agent.name} to do?</span><textarea autoFocus rows={5} value={goal} onChange={event => { setGoal(event.target.value); setError('') }} placeholder={agent.icon === 'pen' ? 'Write a friendly introduction for my next newsletter...' : agent.icon === 'search' ? 'Research the pros and cons of a new idea...' : 'Help me make a plan for...'} /></label>
    <div className="task-suggestions"><span>Need a starting point?</span><div>{(suggestedTasks[agent.icon] ?? ['Help me make a plan for a new idea', 'Break this down into simple steps', 'Give me a fresh perspective']).map(suggestion => <button type="button" key={suggestion} onClick={() => { setGoal(suggestion); setError('') }}>{suggestion} <ArrowUpRight size={14} /></button>)}</div></div>
    <div className="run-context"><span><Brain size={16} />{workspace.memories.filter(memory => memory.agentId === agent.id).length} memories</span><span><Wrench size={16} />{agent.toolIds.filter(id => workspace.integrations.some(tool => tool.id === id && tool.enabled)).length} tools</span><span><Sparkles size={16} />{apiKey ? 'AI key ready' : 'Preview mode'}</span></div>
    {!apiKey && <div className="run-key-notice"><KeyRound size={19} /><span><strong>No AI key set up yet</strong><small>You can try a clearly labeled local preview, or add a key for a real answer.</small></span><button type="button" onClick={() => { onClose(); navigate('settings') }}>Set up <ArrowUpRight size={15} /></button></div>}
    {error && <p className="form-error">{error}</p>}
    <div className="modal-footer"><span className="footer-spacer" /><button type="button" className="button button--outline" onClick={onClose}>Cancel</button><button type="submit" className="button button--dark"><Play size={16} fill="currentColor" />{apiKey ? 'Run agent' : 'Try preview run'}</button></div>
  </form></Modal>
}

export function ResultDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { workspace, openAgent, navigate } = useOrbit()
  const run = workspace.runs.find(item => item.id === id)
  if (!run) return null
  const agent = workspace.agents.find(item => item.id === run.agentId)
  if (!agent) return null
  const isPreview = run.status === 'preview'
  return <Modal title={run.status === 'running' ? `${agent.name} is on it` : run.status === 'failed' ? 'Something went wrong' : isPreview ? 'Preview run' : 'Task complete'} subtitle={`${agent.name} · ${fullDate(run.createdAt)} at ${new Date(run.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`} onClose={onClose} wide className="result-modal">
    <div className="result-body"><div className="result-goal"><span>THE TASK</span><p>{run.goal}</p></div>
      {run.status === 'running' ? <div className="result-loading"><div className="result-loading-orbit"><Sparkles size={28} /></div><h3>Working on it...</h3><p>{agent.name} is putting together a response. You can close this window and check Activity later.</p></div> : <div className={`result-output ${run.status === 'failed' ? 'result-output--error' : ''}`}><div className="result-output-title">{run.status === 'failed' ? <CircleAlert size={18} /> : isPreview ? <EyePreviewIcon /> : <CheckCircle2 size={18} />}<strong>{run.status === 'failed' ? 'Run failed' : isPreview ? 'Local preview' : `${agent.name}'s answer`}</strong></div><div className="prose"><ReactMarkdown>{run.output}</ReactMarkdown></div></div>}
      {run.memoryReview === 'pending' && <MemoryReviewCard key={run.id} run={run} />}
      {run.memoryReview === 'saved' && <div className="memory-saved-note"><span><Brain size={19} /></span><p><strong>Saved as a memory.</strong> {agent.name} can use it next time. You can edit or remove it whenever you like.</p><button onClick={() => { onClose(); navigate('memory') }}>Review <ArrowRight size={15} /></button></div>}
      <div className="run-steps"><h3>Run timeline</h3>{run.steps.length ? run.steps.map(step => <div key={step.id} className="run-step"><span className={`run-step-mark ${step.status === 'error' ? 'run-step-mark--error' : ''}`}>{step.status === 'error' ? <X size={13} /> : <Check size={13} />}</span><div><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</div><time>{timeAgo(step.createdAt)}</time></div>) : <div className="run-step run-step--pending"><span className="run-step-mark"><LoaderCircle size={13} className="spin" /></span><div><strong>Getting started...</strong></div></div>}</div>
      <div className="result-footer"><button className="text-button" onClick={() => { onClose(); openAgent(agent.id) }}>View {agent.name} <ArrowRight size={16} /></button><button className="button button--outline button--small" onClick={onClose}>Close</button></div>
    </div>
  </Modal>
}

function EyePreviewIcon() { return <Globe2 size={18} /> }

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const { workspace, openAgent, openMemoryEditor, navigate } = useOrbit()
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const agents = workspace.agents.filter(agent => `${agent.name} ${agent.role}`.toLowerCase().includes(normalized)).slice(0, 5)
  const memories = workspace.memories.filter(memory => memory.content.toLowerCase().includes(normalized)).slice(0, 4)
  const pages: { name: string; page: 'agents' | 'memory' | 'integrations' | 'activity' | 'settings'; icon: typeof Bot }[] = [
    { name: 'Agents', page: 'agents', icon: Bot }, { name: 'Memory', page: 'memory', icon: Brain },
    { name: 'Integrations', page: 'integrations', icon: Wrench }, { name: 'Activity', page: 'activity', icon: Activity },
    { name: 'Settings', page: 'settings', icon: ShieldCheck },
  ]
  return <Modal onClose={onClose} className="search-modal"><div className="search-dialog-input"><Search size={21} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search agents, memories, and more..." /><kbd>ESC</kbd></div><div className="search-dialog-results">
    {normalized && agents.length > 0 && <><span className="search-group-title">AGENTS</span>{agents.map(agent => <button key={agent.id} onClick={() => { onClose(); openAgent(agent.id) }}><AgentAvatar agent={agent} size="tiny" /><span><strong>{agent.name}</strong><small>{agent.role}</small></span><ChevronRight size={17} /></button>)}</>}
    {normalized && memories.length > 0 && <><span className="search-group-title">MEMORIES</span>{memories.map(memory => <button key={memory.id} onClick={() => { onClose(); openMemoryEditor(memory.id) }}><span className="search-result-icon"><Brain size={17} /></span><span><strong>{memory.content.slice(0, 60)}{memory.content.length > 60 ? '…' : ''}</strong><small>{workspace.agents.find(agent => agent.id === memory.agentId)?.name}</small></span><ChevronRight size={17} /></button>)}</>}
    {!normalized && <><span className="search-group-title">JUMP TO</span>{pages.map(({ name, page, icon: Icon }) => <button key={page} onClick={() => { onClose(); navigate(page) }}><span className="search-result-icon"><Icon size={17} /></span><span><strong>{name}</strong></span><ChevronRight size={17} /></button>)}</>}
    {normalized && !agents.length && !memories.length && <div className="search-no-results">No matches for “{query}”</div>}
  </div><div className="search-dialog-footer"><span>Search your local workspace</span><span>⌘ K to open</span></div></Modal>
}
