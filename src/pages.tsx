import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bot, Brain, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Download, Eye, EyeOff, Globe2, KeyRound, Link2, MoreHorizontal, Pause, Pin, Play, Plus, Search, Settings2, ShieldCheck, Sparkles, Upload, Wrench, X, Zap } from 'lucide-react'
import { useOrbit } from './context'
import { isValidWorkspace } from './storage'
import { needsMemoryReview } from './memory'
import { toolNeedsApproval } from './runtime'
import { MemoryReviewCard } from './MemoryReviewCard'
import { AgentAvatar, ToolAvatar, fullDate, timeAgo } from './ui'
import type { Agent, AgentRun, Integration, Memory } from './types'

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>
}

function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-state-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function AgentCard({ agent }: { agent: Agent }) {
  const { workspace, openAgent, openRunComposer } = useOrbit()
  const memoryCount = workspace.memories.filter(memory => memory.agentId === agent.id).length
  const toolCount = agent.toolIds.filter(id => workspace.integrations.some(tool => tool.id === id && tool.enabled)).length
  return <div className="agent-card" onClick={() => openAgent(agent.id)} role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openAgent(agent.id) } }}>
    <div className="agent-card-top"><AgentAvatar agent={agent} /><span className={`agent-status ${agent.enabled ? '' : 'agent-status--paused'}`}><span />{agent.enabled ? 'Ready' : 'Paused'}</span></div>
    <h3>{agent.name}</h3><div className="agent-card-role">{agent.role}</div>
    <p className="agent-card-description">{agent.description}</p>
    <div className="agent-card-footer"><span><Brain size={15} />{memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}</span><span className="footer-separator" /><span><Wrench size={15} />{toolCount} {toolCount === 1 ? 'tool' : 'tools'}</span>
      <button className="agent-card-arrow" onClick={event => { event.stopPropagation(); openRunComposer(agent.id) }} aria-label={`Run ${agent.name}`} title={`Run ${agent.name}`}><ArrowUpRight size={18} /></button></div>
  </div>
}

function RunStatus({ run }: { run: AgentRun }) {
  const label = run.source === 'sample' ? 'Example' : run.status === 'preview' ? 'Preview' : run.status === 'running' ? 'Running' : run.status === 'completed' ? 'Completed' : 'Failed'
  return <span className={`run-status run-status--${run.source === 'sample' ? 'sample' : run.status}`}><span />{label}</span>
}

export function ActivityRows({ runs, compact = false }: { runs: AgentRun[]; compact?: boolean }) {
  const { workspace, openResult } = useOrbit()
  return <div className={`activity-list ${compact ? 'activity-list--compact' : ''}`}>
    {runs.map(run => {
      const agent = workspace.agents.find(item => item.id === run.agentId)
      if (!agent) return null
      return <button className="activity-row" key={run.id} onClick={() => openResult(run.id)}>
        <AgentAvatar agent={agent} size="tiny" />
        <span className="activity-row-text"><strong>{agent.name} <span>{run.source === 'sample' ? 'has an example run' : run.status === 'running' ? 'is working on a task' : run.status === 'failed' ? 'could not finish a task' : 'finished a task'}</span></strong><small>{run.goal}</small></span>
        <span className="activity-row-right"><RunStatus run={run} /><small>{timeAgo(run.createdAt)}</small></span>
        <ChevronRight className="activity-chevron" size={17} />
      </button>
    })}
  </div>
}

export function OverviewPage() {
  const { workspace, navigate, openAgentEditor, openIntegrationEditor, openRunComposer, setWorkspace, apiKey } = useOrbit()
  const activeCount = workspace.agents.filter(agent => agent.enabled).length
  const completedCount = workspace.runs.filter(run => run.status === 'completed').length
  const hasOwnAgent = workspace.agents.some(agent => !['atlas', 'piper', 'scout'].includes(agent.id))
  const hasRealRun = completedCount > 0
  const pendingReviews = workspace.runs.filter(needsMemoryReview).length
  const progress = Number(hasOwnAgent) + Number(Boolean(apiKey)) + Number(hasRealRun)
  const firstAgent = workspace.agents.find(agent => !['atlas', 'piper', 'scout'].includes(agent.id)) ?? workspace.agents[0]
  const firstSteps = [
    { title: hasOwnAgent ? 'Your helper is ready' : 'Make your first helper', description: 'Choose a template and make it yours.', done: hasOwnAgent, icon: Bot, action: () => hasOwnAgent ? navigate('agents') : openAgentEditor() },
    { title: apiKey ? 'AI key added' : 'Connect your AI', description: 'Add a key from your AI provider.', done: Boolean(apiKey), icon: KeyRound, action: () => navigate('settings') },
    { title: hasRealRun ? 'First task complete' : 'See it in action', description: 'Give your helper a task to work on.', done: hasRealRun, icon: Play, action: () => apiKey && firstAgent ? openRunComposer(firstAgent.id) : apiKey ? openAgentEditor() : navigate('settings') },
  ]
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return <div className="page overview-page">
    <PageHeading eyebrow={date.toUpperCase()} title={`${greeting}, creator ✳`} subtitle="Here's a little look at everything your agents are up to." action={<button className="button button--outline desktop-only" onClick={() => openAgentEditor()}><Plus size={18} /> New agent</button>} />

    <div className="hero-card">
      <div className="hero-content"><span className="hero-kicker"><span className="live-dot" /> YOUR IDEAS, IN MOTION</span><h2>Make room for<br /><em>more</em> of your ideas.</h2><p>Build your own AI agents, give them memory, and let them get to work.</p><button className="button button--lime hero-button" onClick={() => openAgentEditor()}>Create an agent <ArrowUpRight size={18} /></button></div>
      <div className="hero-image" aria-hidden="true" />
      <div className="hero-corner" aria-hidden="true"><Sparkles size={15} /> YOUR AI STUDIO</div>
    </div>

    {!workspace.dismissedWelcome && !hasRealRun && <section className="launchpad" aria-label="Getting started"><div className="launchpad-heading"><div><span className="eyebrow">YOUR FIRST STEPS</span><h2>Let's get your first win.</h2><p>Three small steps to make Orbit feel like yours.</p></div><button onClick={() => setWorkspace(current => ({ ...current, dismissedWelcome: true }))} aria-label="Hide getting started" title="Hide getting started"><X size={18} /></button></div><div className="launchpad-steps">{firstSteps.map(({ title, description, done, icon: Icon, action }, index) => <button key={index} className={`launchpad-step ${done ? 'launchpad-step--done' : ''}`} onClick={action} aria-label={`Step ${index + 1}: ${title}`}><span className="launchpad-step-icon">{done ? <Check size={18} /> : <Icon size={19} />}</span><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={17} className="launchpad-step-arrow" /></button>)}</div><div className="launchpad-foot"><span>Atlas, Piper, and Scout are example agents to explore.</span><div className="launchpad-track"><span style={{ width: `${progress / 3 * 100}%` }} /></div><strong>{progress} of 3 done</strong></div></section>}


    {pendingReviews > 0 && <button className="review-nudge" onClick={() => navigate('memory')}><span><Brain size={19} /></span><span><strong>{pendingReviews} {pendingReviews === 1 ? 'memory suggestion' : 'memory suggestions'} for you</strong><small>Review what your agents want to remember.</small></span><ArrowRight size={18} /></button>}
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-icon stat-icon--green"><Bot size={21} /></span><div><span className="stat-label">Active agents</span><strong>{activeCount.toString().padStart(2, '0')}</strong></div><span className="stat-trend"><span /> Ready to go</span></div>
      <div className="stat-card"><span className="stat-icon stat-icon--purple"><CheckCircle2 size={21} /></span><div><span className="stat-label">Tasks completed</span><strong>{completedCount.toString().padStart(2, '0')}</strong></div><span className="stat-trend">All time</span></div>
      <div className="stat-card"><span className="stat-icon stat-icon--orange"><Brain size={21} /></span><div><span className="stat-label">Saved memories</span><strong>{workspace.memories.length.toString().padStart(2, '0')}</strong></div><span className="stat-trend">Growing smarter</span></div>
    </div>

    <section className="overview-section"><SectionHeading title="Meet your agents" subtitle="Your little team of big thinkers." action={<button className="text-button" onClick={() => navigate('agents')}>View all <ArrowRight size={17} /></button>} />
      {workspace.agents.length ? <div className="agents-grid">{workspace.agents.slice(0, 3).map(agent => <AgentCard key={agent.id} agent={agent} />)}</div> : <EmptyState icon={<Bot size={25} />} title="No agents yet" description="Create your first agent to start building your team." action={<button className="button button--dark" onClick={() => openAgentEditor()}>Create agent</button>} />}
    </section>

    <div className="overview-bottom">
      <section className="panel activity-panel"><SectionHeading title="Recent activity" subtitle="A peek at what your team has been doing." action={<button className="text-button" onClick={() => navigate('activity')}>See all <ArrowRight size={16} /></button>} />
        {workspace.runs.length ? <ActivityRows runs={workspace.runs.slice(0, 4)} compact /> : <EmptyState icon={<Activity size={24} />} title="Quiet for now" description="Your agents' runs will show up here." />}
      </section>
      <section className="connect-panel"><div className="connect-panel-icons"><span><Globe2 size={21} /></span><span><Zap size={21} /></span><span><Wrench size={21} /></span></div><span className="mini-eyebrow">GO FURTHER</span><h3>Great agents need<br />great connections.</h3><p>Bring in live information and let your agents work with the tools you already love.</p><button onClick={() => workspace.integrations.length ? navigate('integrations') : openIntegrationEditor('custom')}>Explore integrations <ArrowUpRight size={17} /></button></section>
    </div>
    {!apiKey && (workspace.dismissedWelcome || hasRealRun) && <div className="setup-nudge"><span className="setup-nudge-icon"><KeyRound size={19} /></span><div><strong>Ready for real answers?</strong><p>Add your AI provider key to start running your agents.</p></div><button onClick={() => navigate('settings')}>Set up AI <ArrowRight size={16} /></button></div>}
  </div>
}

export function AgentsPage() {
  const { workspace, openAgentEditor } = useOrbit()
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [query, setQuery] = useState('')
  const filtered = workspace.agents.filter(agent => (filter === 'all' || (filter === 'active' ? agent.enabled : !agent.enabled)) && `${agent.name} ${agent.role} ${agent.description}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="page">
    <PageHeading eyebrow="YOUR TEAM" title="Meet your agents." subtitle="Made by you, for the things you want to get done." action={<button className="button button--dark" onClick={() => openAgentEditor()}><Plus size={18} /> Create agent</button>} />
    <div className="filter-bar"><div className="segmented-control"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All <span>{workspace.agents.length}</span></button><button className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')}>Active</button><button className={filter === 'paused' ? 'selected' : ''} onClick={() => setFilter('paused')}>Paused</button></div><label className="inline-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find an agent..." /></label></div>
    {filtered.length ? <div className="agents-grid agents-grid--page">{filtered.map(agent => <AgentCard key={agent.id} agent={agent} />)}<button className="new-agent-card" onClick={() => openAgentEditor()}><span><Plus size={25} /></span><strong>Create an agent</strong><small>There's always room for one more idea.</small></button></div> : <EmptyState icon={<Bot size={26} />} title={query ? 'No agents found' : 'No agents here yet'} description={query ? 'Try another search or filter.' : 'Build an agent to fill this space.'} action={!query && <button className="button button--dark" onClick={() => openAgentEditor()}>Create agent</button>} />}
  </div>
}

function MemoryRow({ memory }: { memory: Memory }) {
  const { workspace, openMemoryEditor, setWorkspace } = useOrbit()
  const agent = workspace.agents.find(item => item.id === memory.agentId)
  if (!agent) return null
  return <div className="memory-row"><div className={`memory-kind-icon memory-kind-icon--${memory.kind}`}><Brain size={18} /></div><button className="memory-row-body" onClick={() => openMemoryEditor(memory.id)}><span className="memory-row-content">{memory.content}</span><span className="memory-row-meta"><AgentAvatar agent={agent} size="tiny" /> {agent.name} <span className="meta-dot">·</span> {memory.kind} <span className="meta-dot">·</span> {timeAgo(memory.createdAt)}</span></button><button className={`pin-button ${memory.pinned ? 'pin-button--active' : ''}`} onClick={() => setWorkspace(current => ({ ...current, memories: current.memories.map(item => item.id === memory.id ? { ...item, pinned: !item.pinned } : item) }))} aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory'} title={memory.pinned ? 'Unpin memory' : 'Pin memory'}><Pin size={17} fill={memory.pinned ? 'currentColor' : 'none'} /></button><button className="icon-button memory-edit" onClick={() => openMemoryEditor(memory.id)} aria-label="Edit memory"><MoreHorizontal size={19} /></button></div>
}

export function MemoryPage() {
  const { workspace, openMemoryEditor } = useOrbit()
  const [agentFilter, setAgentFilter] = useState('all')
  const [query, setQuery] = useState('')
  const filtered = workspace.memories.filter(memory => (agentFilter === 'all' || memory.agentId === agentFilter) && memory.content.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
  const pendingReviews = workspace.runs.filter(needsMemoryReview)
  return <div className="page">
    <PageHeading eyebrow="THE MEMORY VAULT" title="What they know, stays." subtitle="You decide what each agent remembers for next time." action={<button className="button button--dark" onClick={() => openMemoryEditor()}><Plus size={18} /> Add memory</button>} />
    {pendingReviews.length > 0 && <section className="memory-review-section"><SectionHeading title={`For your review (${pendingReviews.length})`} subtitle="Nothing is remembered until you choose to save it." /><div className="memory-review-grid">{pendingReviews.map(run => <MemoryReviewCard key={run.id} run={run} compact />)}</div></section>}
    <div className="memory-banner"><span className="memory-banner-icon"><Brain size={27} /></span><div><strong>Little details. Better results.</strong><p>Saved memories help your agents remember what matters. Add one yourself, or approve a suggestion after a run.</p></div><span className="memory-banner-art" aria-hidden="true">✳</span></div>
    <div className="memory-summary"><div><strong>{workspace.memories.length}</strong><span>Total memories</span></div><div><strong>{workspace.memories.filter(memory => memory.pinned).length}</strong><span>Pinned</span></div><div><strong>{workspace.agents.filter(agent => workspace.memories.some(memory => memory.agentId === agent.id)).length}</strong><span>Agents remembering</span></div></div>
    <div className="section-heading memory-list-heading"><div><h2>All memories</h2><p>Keep the things worth remembering close.</p></div></div>
    <div className="filter-bar"><div className="filter-select-wrap"><Bot size={17} /><select value={agentFilter} onChange={event => setAgentFilter(event.target.value)} aria-label="Filter by agent"><option value="all">All agents</option>{workspace.agents.map(agent => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select></div><label className="inline-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search memories..." /></label></div>
    <div className="memory-list">{filtered.length ? filtered.map(memory => <MemoryRow key={memory.id} memory={memory} />) : <EmptyState icon={<Brain size={25} />} title={query ? 'Nothing matching that search' : 'Nothing saved here yet'} description={query ? 'Try a different word or agent.' : 'Add a memory to help your agent understand you.'} action={!query && <button className="button button--dark" onClick={() => openMemoryEditor()}>Add memory</button>} />}</div>
  </div>
}

export function AgentDetailPage({ agent }: { agent: Agent }) {
  const { workspace, background, navigate, openAgentEditor, openRunComposer, openMemoryEditor, setWorkspace } = useOrbit()
  const [tab, setTab] = useState<'overview' | 'memory' | 'runs' | 'settings'>('overview')
  const memories = workspace.memories.filter(memory => memory.agentId === agent.id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
  const runs = workspace.runs.filter(run => run.agentId === agent.id)
  const pendingRuns = runs.filter(needsMemoryReview)
  const tools = workspace.integrations.filter(tool => agent.toolIds.includes(tool.id))
  const completed = runs.filter(run => run.status === 'completed').length
  return <div className="page detail-page">
    <button className="back-link" onClick={() => navigate('agents')}><ArrowLeft size={17} /> All agents</button>
    <div className="detail-header"><div className="detail-header-identity"><AgentAvatar agent={agent} size="large" /><div><span className="eyebrow">YOUR AI AGENT</span><h1>{agent.name} <span className={`agent-status ${agent.enabled ? '' : 'agent-status--paused'}`}><span />{agent.enabled ? 'Ready' : 'Paused'}</span></h1><p>{agent.role} <span className="meta-dot">·</span> Created {fullDate(agent.createdAt)}</p></div></div><div className="detail-header-actions"><button className="button button--outline" onClick={() => openAgentEditor(agent.id)}><Settings2 size={17} /> Edit agent</button><button className="button button--dark" onClick={() => openRunComposer(agent.id)}><Play size={16} fill="currentColor" /> Run agent</button></div></div>
    <div className="detail-tabs" role="tablist">{(['overview', 'memory', 'runs', 'settings'] as const).map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} role="tab" aria-selected={tab === item}>{item === 'runs' ? 'Activity' : item.charAt(0).toUpperCase() + item.slice(1)}{item === 'memory' && <span>{memories.length + pendingRuns.length}</span>}</button>)}</div>
    {tab === 'overview' && <div className="detail-layout"><div className="detail-primary">
      <div className="detail-task-card"><span className="detail-task-icon"><Sparkles size={22} /></span><h2>What should {agent.name} work on?</h2><p>Give your agent a goal. It will use its instructions, memories, and connected tools to help you get there.</p><button onClick={() => openRunComposer(agent.id)}>Give {agent.name} a task <ArrowUpRight size={18} /></button></div>
      <section className="panel detail-about"><SectionHeading title={`About ${agent.name}`} action={<button className="icon-button" onClick={() => openAgentEditor(agent.id)} aria-label="Edit agent"><MoreHorizontal size={20} /></button>} /><p className="detail-description">{agent.description}</p><div className="detail-instructions"><span>INSTRUCTIONS</span><p>{agent.instructions}</p></div></section>
      <section className="panel detail-recent"><SectionHeading title="Recent runs" action={<button className="text-button" onClick={() => setTab('runs')}>View all <ArrowRight size={16} /></button>} />{runs.length ? <ActivityRows runs={runs.slice(0, 3)} compact /> : <EmptyState icon={<Activity size={23} />} title="No runs yet" description="Give this agent a task to see its work here." />}</section>
    </div><div className="detail-sidebar"><section className="panel detail-snapshot"><h3>At a glance</h3><div className="snapshot-stats"><div><strong>{completed.toString().padStart(2, '0')}</strong><span>Completed</span></div><div><strong>{memories.length.toString().padStart(2, '0')}</strong><span>Memories</span></div></div><div className="snapshot-line"><span><CalendarDays size={17} /> Schedule</span><strong>{agent.schedule === 'manual' ? 'On demand' : agent.schedule === 'hourly' ? 'Hourly' : 'Daily'}</strong></div><div className="snapshot-line"><span><Clock3 size={17} /> Last run</span><strong>{agent.lastRunAt ? timeAgo(agent.lastRunAt) : 'Not yet'}</strong></div><div className="snapshot-line"><span><Wrench size={17} /> Tools</span><strong>{tools.length} connected</strong></div></section>
      <section className="panel detail-tools"><SectionHeading title="Connected tools" action={<button className="text-button" onClick={() => openAgentEditor(agent.id)}>Manage <ArrowUpRight size={15} /></button>} />{tools.length ? <div className="detail-tool-list">{tools.map(tool => <div key={tool.id}><ToolAvatar icon={tool.icon} size="small" /><span>{tool.name}</span><Check size={16} /></div>)}</div> : <div className="detail-tool-empty"><span><Link2 size={21} /></span><p>No tools connected yet. Add one to unlock more possibilities.</p><button onClick={() => openAgentEditor(agent.id)}>Add a tool <ArrowRight size={15} /></button></div>}</section>
    </div></div>}
    {tab === 'memory' && <div className="detail-tab-content"><SectionHeading title={`${agent.name}'s memory`} subtitle="The context this agent takes into every real run." action={<button className="button button--dark button--small" onClick={() => openMemoryEditor()}><Plus size={16} /> Add memory</button>} />{pendingRuns.length > 0 && <div className="agent-pending-reviews"><SectionHeading title="Waiting for your review" subtitle="These won't be used until you save them." />{pendingRuns.map(run => <MemoryReviewCard key={run.id} run={run} compact />)}</div>}<div className="memory-list">{memories.length ? memories.map(memory => <MemoryRow key={memory.id} memory={memory} />) : <EmptyState icon={<Brain size={25} />} title="Nothing to remember yet" description="Add a detail that will help this agent do better work." action={<button className="button button--dark" onClick={() => openMemoryEditor()}>Add memory</button>} />}</div></div>}
    {tab === 'runs' && <div className="detail-tab-content"><SectionHeading title="Run history" subtitle="Every task, from first thought to final answer." action={<button className="button button--dark button--small" onClick={() => openRunComposer(agent.id)}><Play size={15} /> New run</button>} /><div className="panel">{runs.length ? <ActivityRows runs={runs} /> : <EmptyState icon={<Activity size={25} />} title="No activity yet" description="Run this agent to start a new chapter." />}</div></div>}
    {tab === 'settings' && <div className="detail-tab-content detail-settings"><section className="panel"><SectionHeading title="Agent settings" subtitle="The little things that make this agent yours." action={<button className="button button--outline button--small" onClick={() => openAgentEditor(agent.id)}>Edit details <ArrowUpRight size={15} /></button>} /><div className="settings-info-row"><span>Role</span><strong>{agent.role}</strong></div><div className="settings-info-row"><span>Schedule</span><strong>{agent.schedule === 'manual' ? 'Only when I run it' : `${agent.schedule === 'hourly' ? 'About hourly' : 'About daily'} ${background.status?.enabled ? '(Android background)' : '(while app is open)'}`}</strong></div>{agent.schedule !== 'manual' && <div className="settings-info-row"><span>Recurring goal</span><strong>{agent.recurringGoal || 'Not set'}</strong></div>}<div className="settings-info-row"><span>Connected tools</span><strong>{tools.length}</strong></div><div className="settings-info-row"><span>Status</span><strong>{agent.enabled ? 'Active' : 'Paused'}</strong></div></section><section className="panel pause-panel"><div><h3>{agent.enabled ? 'Need a little pause?' : 'Ready to get back to it?'}</h3><p>{agent.enabled ? 'Pausing stops scheduled runs. You can still edit this agent anytime.' : 'Resume this agent to allow scheduled runs again.'}</p></div><button className="button button--outline" onClick={() => setWorkspace(current => ({ ...current, agents: current.agents.map(item => item.id === agent.id ? { ...item, enabled: !item.enabled } : item) }))}>{agent.enabled ? <Pause size={16} /> : <Play size={16} />}{agent.enabled ? 'Pause agent' : 'Resume agent'}</button></section></div>}
  </div>
}

const directory: { id: string; name: string; category: string; description: string; icon: Integration['icon']; badge?: string }[] = [
  { id: 'tavily', name: 'Web search', category: 'RESEARCH', description: 'Give your agents fresh answers from across the web with Tavily.', icon: 'search', badge: 'Popular' },
  { id: 'slack', name: 'Slack', category: 'MESSAGING', description: 'Send updates to a Slack channel using an incoming webhook.', icon: 'slack' },
  { id: 'webhook', name: 'Webhook', category: 'AUTOMATION', description: 'Send a request to any HTTPS webhook when an agent needs to.', icon: 'webhook' },
  { id: 'custom', name: 'Custom API', category: 'DEVELOPER', description: 'Connect the web service you love with a GET or POST request.', icon: 'globe' },
]

export function IntegrationsPage() {
  const { workspace, openIntegrationEditor } = useOrbit()
  return <div className="page">
    <PageHeading eyebrow="A MORE CONNECTED WORKSPACE" title="Connect the dots." subtitle="Let your agents reach beyond the chat and into the tools you use." action={<button className="button button--dark" onClick={() => openIntegrationEditor('custom')}><Plus size={18} /> Add custom API</button>} />
    <div className="integration-hero"><div><span className="integration-hero-label"><Zap size={15} fill="currentColor" /> SUPERCHARGE YOUR AGENTS</span><h2>Better together.</h2><p>Give an agent access to a connected API, and it can use that tool when a task calls for it.</p></div><div className="integration-hero-art" aria-hidden="true"><span><Bot size={29} /></span><i /><span><Globe2 size={27} /></span><i /><span><Wrench size={25} /></span></div></div>
    <section className="integrations-section"><SectionHeading title="Explore integrations" subtitle="Choose a starting point. Make it your own." /><div className="directory-grid">{directory.map(item => <button className="directory-card" key={item.id} onClick={() => openIntegrationEditor(item.id)}><div className="directory-card-top"><ToolAvatar icon={item.icon} />{item.badge && <span className="directory-badge">{item.badge}</span>}</div><span className="directory-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><span className="directory-connect">Set up tool <ArrowUpRight size={17} /></span></button>)}</div></section>
    <section className="integrations-section connected-section"><SectionHeading title="Your connected tools" subtitle="Available to the agents you choose." action={<span className="section-count">{workspace.integrations.length} connected</span>} />
      {workspace.integrations.length ? <div className="connected-list">{workspace.integrations.map(tool => <button key={tool.id} className="connected-row" onClick={() => openIntegrationEditor(tool.id)}><ToolAvatar icon={tool.icon} /><span><strong>{tool.name}</strong><small>{new URL(tool.url).hostname} · {workspace.agents.filter(agent => agent.toolIds.includes(tool.id)).length} agents using this · {toolNeedsApproval(tool) ? 'Asks permission' : 'Runs without asking'}</small></span><span className={`agent-status ${tool.enabled ? '' : 'agent-status--paused'}`}><span />{tool.enabled ? 'Connected' : 'Paused'}</span><ChevronRight size={18} /></button>)}</div> : <div className="connected-empty"><div className="connected-empty-icon"><Link2 size={23} /></div><strong>No connections just yet</strong><p>Pick an integration above to give your agents a new superpower.</p></div>}
    </section>
    <div className="privacy-note"><ShieldCheck size={18} /><span>POST tools ask permission by default. You can require approval for any tool; scheduled runs never use connected APIs.</span></div>
  </div>
}

export function ActivityPage() {
  const { workspace } = useOrbit()
  const [filter, setFilter] = useState<'all' | 'completed' | 'preview' | 'failed'>('all')
  const filtered = workspace.runs.filter(run => filter === 'all' || (filter === 'preview' ? run.status === 'preview' : run.status === filter))
  return <div className="page"><PageHeading eyebrow="A RUNNING STORY" title="Everything in motion." subtitle="See what your agents have worked on, and how they got there." />
    <div className="activity-summary"><div><span className="stat-icon stat-icon--purple"><Activity size={20} /></span><strong>{workspace.runs.filter(run => run.source !== 'sample').length}</strong><small>Total runs</small></div><div><span className="stat-icon stat-icon--green"><Check size={20} /></span><strong>{workspace.runs.filter(run => run.status === 'completed').length}</strong><small>Completed</small></div><div><span className="stat-icon stat-icon--orange"><Clock3 size={20} /></span><strong>{workspace.runs.filter(run => run.status === 'running').length}</strong><small>In progress</small></div></div>
    <SectionHeading title="Run history" subtitle="The full picture, one task at a time." /><div className="filter-bar activity-filter"><div className="segmented-control">{(['all', 'completed', 'preview', 'failed'] as const).map(item => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</div></div>
    <div className="panel">{filtered.length ? <ActivityRows runs={filtered} /> : <EmptyState icon={<Activity size={26} />} title="Nothing here yet" description="When your agents get to work, their runs will appear here." />}</div>
  </div>
}

const providerDetails = {
  openai: { label: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  openrouter: { label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
  custom: { label: 'Custom', endpoint: '', model: '' },
}

export function SettingsPage({ onReset }: { onReset: () => void }) {
  const { workspace, setWorkspace, apiKey, setApiKey, background, navigate, toast } = useOrbit()
  const [provider, setProvider] = useState(workspace.settings.provider)
  const [endpoint, setEndpoint] = useState(workspace.settings.endpoint)
  const [model, setModel] = useState(workspace.settings.model)
  const [secret, setSecret] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [showAdvancedEndpoint, setShowAdvancedEndpoint] = useState(workspace.settings.provider === 'custom' || workspace.settings.endpoint !== providerDetails[workspace.settings.provider].endpoint)
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const scheduledAgents = workspace.agents.filter(agent => agent.enabled && agent.schedule !== 'manual' && agent.recurringGoal.trim())
  useEffect(() => { setSecret(apiKey) }, [apiKey])

  function changeProvider(value: typeof provider) {
    setProvider(value)
    if (value !== 'custom') { setEndpoint(providerDetails[value].endpoint); setModel(providerDetails[value].model) }
    else { setEndpoint(''); setModel('') }
    setShowAdvancedEndpoint(value === 'custom')
    setError('')
  }
  async function saveSettings() {
    if (!model.trim()) { setError('Enter a model name.'); return }
    try { if (new URL(endpoint).protocol !== 'https:') throw new Error() }
    catch { setError('Enter a valid HTTPS chat completions URL.'); return }
    const changedProvider = provider !== workspace.settings.provider || endpoint.trim() !== workspace.settings.endpoint || model.trim() !== workspace.settings.model
    if (changedProvider && background.status?.enabled && !(await background.disable())) return
    setWorkspace(current => ({ ...current, settings: { provider, endpoint: endpoint.trim(), model: model.trim() } }))
    setApiKey(secret.trim())
    setError('')
    toast(changedProvider && background.status?.enabled ? 'AI settings saved. Re-enable background runs for this provider.' : 'AI settings saved')
  }
  async function exportData() {
    const filename = `orbit-workspace-${new Date().toISOString().slice(0, 10)}.json`
    const content = JSON.stringify(workspace, null, 2)
    try {
      if (Capacitor.isNativePlatform()) {
        const file = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
        await Share.share({ title: 'Orbit workspace backup', url: file.uri, dialogTitle: 'Save or share your backup' })
      } else {
        const blob = new Blob([content], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      toast('Workspace exported')
    } catch (err) { toast(err instanceof Error ? err.message : 'Could not export the workspace.') }
  }
  async function importData(file?: File) {
    if (!file) return
    try {
      const data: unknown = JSON.parse(await file.text())
      if (!isValidWorkspace(data)) throw new Error('Not a valid Orbit workspace file.')
      if (!window.confirm('Import this workspace? It will replace the agents, memories, tools, and runs on this device.')) return
      if (!(await background.clear())) throw new Error('Clear background runs before importing a workspace.')
      setWorkspace({ ...data, dismissedWelcome: data.dismissedWelcome ?? true })
      setProvider(data.settings.provider); setEndpoint(data.settings.endpoint); setModel(data.settings.model)
      setShowAdvancedEndpoint(data.settings.provider === 'custom' || data.settings.endpoint !== providerDetails[data.settings.provider].endpoint)
      toast('Workspace imported')
    } catch (err) { toast(err instanceof Error ? err.message : 'Could not import that file.') }
    if (fileInput.current) fileInput.current.value = ''
  }
  return <div className="page settings-page"><PageHeading eyebrow="MAKE IT YOURS" title="Workspace settings." subtitle="Set up your AI provider and keep your workspace in your hands." />
    <div className="settings-layout"><div className="settings-primary"><section className="panel settings-card"><div className="settings-card-heading"><span className="settings-heading-icon"><Sparkles size={21} /></span><div><h2>AI provider</h2><p>Power your agents with an OpenAI-compatible model.</p></div><span className={`settings-connection ${apiKey ? 'settings-connection--on' : ''}`}><span />{apiKey ? 'Key active' : 'Not set up'}</span></div>
      <div className="settings-form"><label className="field-label">Choose a provider</label><div className="provider-grid">{(Object.keys(providerDetails) as Array<keyof typeof providerDetails>).map(item => <button type="button" className={`provider-choice ${provider === item ? 'provider-choice--active' : ''}`} aria-pressed={provider === item} key={item} onClick={() => changeProvider(item)}><span className="provider-choice-icon">{item === 'openai' ? <Sparkles size={19} /> : item === 'openrouter' ? <Globe2 size={19} /> : <Wrench size={19} />}</span><strong>{providerDetails[item].label}</strong>{provider === item && <Check size={16} />}</button>)}</div>
      <div className="form-row"><label className="field"><span>API key <small>{background.status?.enabled ? 'ENCRYPTED FOR BACKGROUND' : 'SESSION ONLY'}</small></span><span className="password-wrap"><input type={showKey ? 'text' : 'password'} value={secret} onChange={event => setSecret(event.target.value)} placeholder="Enter your API key" autoComplete="off" /><button type="button" onClick={() => setShowKey(value => !value)} aria-label={showKey ? 'Hide key' : 'Show key'}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></span><small>Use a key from your provider, not your account password.</small></label><label className="field"><span>AI model</span><input value={model} onChange={event => setModel(event.target.value)} placeholder="e.g. gpt-4o-mini" /><small>The suggested model is a good place to start.</small></label></div>
      {provider === 'custom' || showAdvancedEndpoint ? <label className="field"><span>Chat completions endpoint</span><input value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://api.example.com/v1/chat/completions" />{provider !== 'custom' && <small>Only change this if your provider gave you a different URL.</small>}</label> : <button type="button" className="settings-advanced-link" onClick={() => setShowAdvancedEndpoint(true)}>Advanced: change the API endpoint <ChevronRight size={16} /></button>}
      {error && <p className="form-error">{error}</p>}<div className="settings-save-row"><p><ShieldCheck size={16} /> {background.status?.enabled ? 'Your key is encrypted in Android Keystore for unattended runs.' : 'Your AI key is kept for this session and sent only to your chosen provider.'}</p><button className="button button--dark" onClick={saveSettings}>Save settings <ArrowRight size={17} /></button></div></div>
    </section>
    <section className="panel settings-card background-card">
      <div className="settings-card-heading"><span className="settings-heading-icon settings-heading-icon--sky"><Clock3 size={21} /></span><div><h2>Background runs</h2><p>Let scheduled agents work while Android is closed.</p></div><span className={`settings-connection ${background.status?.enabled ? 'settings-connection--on' : ''}`}><span />{!background.supported ? 'Android only' : background.status === null ? 'Checking' : background.status.enabled ? 'On' : 'Off'}</span></div>
      <div className="background-illustration" aria-hidden="true"><span className="background-orbit background-orbit--outer" /><span className="background-orbit background-orbit--inner" /><span className="background-orbit-core"><Bot size={27} /></span><span className="background-orbit-moon"><Sparkles size={18} /></span><span className="background-orbit-clock"><Clock3 size={17} /></span></div>
      <p className="background-intro">{background.supported ? 'Opt in to let Android check your hourly or daily goals without keeping Orbit open.' : 'Install the Android app to run scheduled goals when Orbit is closed. In this browser, schedules only run while the tab is open.'}</p>
      <ul className="background-facts"><li><Clock3 size={16} /> Android checks periodically with a network connection. Battery rules can delay or skip runs; hourly and daily are not exact times.</li><li><ShieldCheck size={16} /> Background tasks use saved memories, never connected tools or requests that need your approval. Each result waits for your review.</li><li><KeyRound size={16} /> Your provider key is encrypted with Android Keystore for this feature. Provider calls can use paid credits.</li></ul>
      {background.supported && <div className="background-controls"><div><strong>{scheduledAgents.length} {scheduledAgents.length === 1 ? 'agent' : 'agents'} scheduled</strong><small>{scheduledAgents.length ? 'Choose an agent to adjust its recurring goal.' : 'Choose Hourly or Daily in an agent’s extra options to get started.'}</small></div>{background.status?.enabled ? <button className="button button--outline" disabled={background.busy} onClick={() => void background.disable()}>{background.busy ? 'Working...' : 'Turn off background runs'}</button> : <button className="button button--dark" disabled={background.busy || background.status === null || !apiKey} onClick={() => void background.enable()}>{background.busy ? 'Working...' : 'Enable on Android'} <ArrowRight size={16} /></button>}</div>}
      {background.supported && !apiKey && <p className="background-hint">Save an AI key above to turn on background runs.</p>}
      {background.supported && scheduledAgents.length === 0 && <button className="background-agent-link" onClick={() => navigate('agents')}>Choose an agent <ArrowRight size={15} /></button>}
      {background.status?.enabled && <div className="background-meta"><span><CheckCircle2 size={15} /> Last run: {background.status.lastRunAt ? timeAgo(background.status.lastRunAt) : 'Waiting for a scheduled goal'}</span>{!background.status.notificationsGranted && <button onClick={() => void background.requestNotifications()}><Bell size={15} /> Turn on notifications</button>}</div>}
      {background.status?.lastError && <p className="background-error"><Clock3 size={15} />{background.status.lastError}</p>}
    </section>
    <section className="panel settings-card"><div className="settings-card-heading"><span className="settings-heading-icon settings-heading-icon--mint"><Brain size={21} /></span><div><h2>Your data</h2><p>Your agents and memories are saved on this device.</p></div></div><div className="data-actions"><div><Download size={20} /><span><strong>Export workspace</strong><small>Download a JSON backup of your agents, memories, and runs.</small></span><button className="button button--outline button--small" onClick={exportData}>Export</button></div><div><Upload size={20} /><span><strong>Import workspace</strong><small>Restore a previously exported Orbit workspace.</small></span><button className="button button--outline button--small" onClick={() => fileInput.current?.click()}>Import</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={event => void importData(event.target.files?.[0])} /></div></div></section>
    <section className="panel settings-card danger-card"><h2>Start fresh</h2><p>Clear everything on this device and return to the example workspace.</p><button onClick={onReset}>Reset workspace</button></section></div>
    <aside className="settings-aside"><div className="settings-tip"><span><KeyRound size={23} /></span><h3>Your key, your call.</h3><p>Orbit doesn't include an AI subscription. Bring your own key from OpenAI, OpenRouter, or another compatible provider. Provider usage may incur charges.</p></div><div className="settings-tip settings-tip--light"><span><ShieldCheck size={23} /></span><h3>A note on privacy</h3><p>Workspace data and tool configurations are stored locally without encryption. AI keys are session-only unless you opt in to Android background runs, which encrypts the provider key with Android Keystore. Avoid storing sensitive tool credentials on a shared device.</p></div></aside></div>
  </div>
}
