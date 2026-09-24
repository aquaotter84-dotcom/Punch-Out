import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { Activity, ArrowRight, Bell, Bot, Brain, ChevronDown, ChevronRight, CircleHelp, LayoutDashboard, Menu, Plus, Search, Settings2, Sparkles, Wrench, X } from 'lucide-react'
import { OrbitContext } from './context'
import { Brand } from './ui'
import { getAIKey, initialWorkspace, loadWorkspace, saveAIKey, saveWorkspace } from './storage'
import { executeAgent, previewAgent } from './runtime'
import { needsMemoryReview, suggestMemory } from './memory'
import { backgroundSnapshot, mergeBackgroundRuns, OrbitBackground, supportsBackgroundRuns, type BackgroundStatus } from './background'
import { newId, type AgentRun, type Integration, type Page, type Workspace } from './types'
import { OverviewPage, AgentsPage, AgentDetailPage, MemoryPage, IntegrationsPage, ActivityPage, SettingsPage } from './pages'
import { AgentEditor, MemoryEditor, IntegrationEditor, RunComposer, ResultDialog, SearchDialog, ToolApprovalDialog } from './dialogs'

type PendingToolApproval = { id: string; agentName: string; tool: Integration; input: string; decide: (allowed: boolean) => void }

const navigation: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'overview', label: 'Overview', icon: LayoutDashboard },
  { page: 'agents', label: 'My agents', icon: Bot },
  { page: 'memory', label: 'Memory', icon: Brain },
  { page: 'integrations', label: 'Integrations', icon: Wrench },
  { page: 'activity', label: 'Activity', icon: Activity },
]

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace)
  const [apiKey, setApiKeyState] = useState(getAIKey)
  const [page, setPage] = useState<Page>('overview')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agentEditorId, setAgentEditorId] = useState<string | null>(null)
  const [memoryEditorId, setMemoryEditorId] = useState<string | null>(null)
  const [integrationEditorId, setIntegrationEditorId] = useState<string | null>(null)
  const [runComposerId, setRunComposerId] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toolApproval, setToolApproval] = useState<PendingToolApproval | null>(null)
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundStatus | null>(null)
  const [backgroundBusy, setBackgroundBusy] = useState(false)
  const backgroundEnabledRef = useRef(false)
  const backgroundVersionRef = useRef(0)
  const backgroundSyncRef = useRef<Promise<void>>(Promise.resolve())
  const approvalRef = useRef<PendingToolApproval | null>(null)
  const runningRef = useRef(false)
  const workspaceRef = useRef(workspace)
  const apiKeyRef = useRef(apiKey)
  const startRunRef = useRef<(agentId: string, goal: string, preview?: boolean, scheduled?: boolean) => Promise<void>>(async () => {})
  workspaceRef.current = workspace
  apiKeyRef.current = apiKey

  useEffect(() => { saveWorkspace(workspace) }, [workspace])
  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(''), 3800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (approvalRef.current) return
        setSearchOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let removed = false
    let listener: { remove: () => Promise<void> } | undefined
    void NativeApp.addListener('backButton', () => {
      if (approvalRef.current) approvalRef.current.decide(false)
      else if (searchOpen) setSearchOpen(false)
      else if (resultId) setResultId(null)
      else if (runComposerId) setRunComposerId(null)
      else if (agentEditorId) setAgentEditorId(null)
      else if (memoryEditorId) setMemoryEditorId(null)
      else if (integrationEditorId) setIntegrationEditorId(null)
      else if (mobileMenuOpen) setMobileMenuOpen(false)
      else if (selectedAgentId) navigate('agents')
      else if (page !== 'overview') navigate('overview')
      else void NativeApp.exitApp()
    }).then(handle => { if (removed) void handle.remove(); else listener = handle })
    return () => { removed = true; if (listener) void listener.remove() }
  }, [searchOpen, resultId, runComposerId, agentEditorId, memoryEditorId, integrationEditorId, mobileMenuOpen, selectedAgentId, page])
  useEffect(() => {
    if (!supportsBackgroundRuns()) return
    let live = true
    let refreshing = false
    let warned = false
    let listener: { remove: () => Promise<void> } | undefined
    const refresh = async () => {
      if (refreshing) return
      refreshing = true
      const version = backgroundVersionRef.current
      try {
        const status = await OrbitBackground.status()
        if (!live || version !== backgroundVersionRef.current) return
        backgroundEnabledRef.current = status.enabled
        setBackgroundStatus(status)
        if (status.enabled && !apiKeyRef.current) {
          try {
            const restored = await OrbitBackground.restoreKey()
            if (live && version === backgroundVersionRef.current && !apiKeyRef.current) {
              apiKeyRef.current = restored.apiKey
              setApiKeyState(restored.apiKey)
              saveAIKey(restored.apiKey)
            }
          } catch {
            // A deleted/unavailable Keystore key must not leave an apparently active schedule.
            if (version === backgroundVersionRef.current) {
              const disabled = await OrbitBackground.disable()
              if (live) { backgroundEnabledRef.current = false; setBackgroundStatus(disabled); toast('Background key unavailable. Enable background runs again in Settings.') }
            }
          }
        }
        const { runs } = await OrbitBackground.pending()
        if (!live || version !== backgroundVersionRef.current || !runs.length) return
        const ids = runs.flatMap(item => item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' ? [item.id] : [])
        const next = mergeBackgroundRuns(workspaceRef.current, runs)
        if (!saveWorkspace(next)) { toast('Could not save background results. Free up device storage and reopen Orbit.'); return }
        workspaceRef.current = next
        setWorkspace(current => mergeBackgroundRuns(current, runs))
        const acknowledged = await OrbitBackground.acknowledge({ ids })
        if (live) setBackgroundStatus(acknowledged)
      } catch {
        if (live && !warned) { warned = true; toast('Could not check Android background runs. Try reopening Orbit.') }
      } finally { refreshing = false }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    void NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void refresh()
      else approvalRef.current?.decide(false)
    }).then(handle => { if (live) listener = handle; else void handle.remove() })
    return () => { live = false; window.clearInterval(timer); if (listener) void listener.remove() }
  }, [])
  const scheduleSnapshot = backgroundSnapshot(workspace)
  useEffect(() => {
    if (!supportsBackgroundRuns() || !backgroundStatus?.enabled) return
    const version = backgroundVersionRef.current
    backgroundSyncRef.current = backgroundSyncRef.current.then(async () => {
      if (version !== backgroundVersionRef.current) return
      try {
        const status = await OrbitBackground.syncWorkspace({ workspace: scheduleSnapshot })
        if (version !== backgroundVersionRef.current) return
        backgroundEnabledRef.current = status.enabled
        setBackgroundStatus(status)
        if (status.reason === 'provider_changed') toast('AI settings changed. Re-enable background runs to confirm the new provider.')
      } catch {
        if (version !== backgroundVersionRef.current) return
        try { const status = await OrbitBackground.disable(); backgroundEnabledRef.current = false; setBackgroundStatus(status) }
        catch { /* The next resume will refresh the native state. */ }
        toast('Background runs paused because the workspace could not be updated. Re-enable them in Settings.')
      }
    })
  }, [scheduleSnapshot, backgroundStatus?.enabled])
  useEffect(() => {
    // In-app scheduling continues when Android background runs are off (and on the web).
    const timer = window.setInterval(() => {
      if (runningRef.current || !apiKeyRef.current || (supportsBackgroundRuns() && backgroundEnabledRef.current)) return
      const data = workspaceRef.current
      const now = Date.now()
      const due = data.agents.find(agent => {
        if (!agent.enabled || agent.schedule === 'manual' || !agent.recurringGoal.trim()) return false
        const interval = agent.schedule === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        return now - new Date(agent.lastRunAt ?? agent.createdAt).getTime() >= interval
      })
      if (due) void startRunRef.current(due.id, due.recurringGoal, false, true)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => { approvalRef.current?.decide(false) }, [])

  function requestToolApproval(agentName: string, tool: Integration, input: string): Promise<boolean> {
    return new Promise(resolve => {
      const id = newId()
      let timer: number
      const pending: PendingToolApproval = {
        id, agentName, tool, input,
        decide: allowed => {
          if (approvalRef.current?.id !== id) return
          window.clearTimeout(timer)
          approvalRef.current = null
          setToolApproval(null)
          resolve(allowed)
        },
      }
      timer = window.setTimeout(() => pending.decide(false), 5 * 60_000)
      approvalRef.current = pending
      setToolApproval(pending)
    })
  }

  function toast(message: string) { setToastMessage(message) }
  async function enableBackground() {
    if (!supportsBackgroundRuns()) return
    if (!apiKeyRef.current.trim()) { toast('Save your AI key first to enable background runs.'); return }
    backgroundVersionRef.current++
    setBackgroundBusy(true)
    try {
      const status = await OrbitBackground.configure({ workspace: backgroundSnapshot(workspaceRef.current), apiKey: apiKeyRef.current })
      backgroundEnabledRef.current = status.enabled
      setBackgroundStatus(status)
      try {
        const permission = await OrbitBackground.requestNotifications()
        setBackgroundStatus(current => current ? { ...current, notificationsGranted: permission.granted } : status)
        toast(permission.granted ? 'Background runs enabled' : 'Background runs enabled. Notifications are off; review results in Orbit.')
      } catch { toast('Background runs enabled. Notification permission could not be requested.') }
    } catch (error) {
      backgroundEnabledRef.current = false
      setBackgroundStatus(null)
      toast(error instanceof Error ? error.message : 'Could not enable background runs.')
    } finally { setBackgroundBusy(false) }
  }
  async function disableBackground(): Promise<boolean> {
    if (!supportsBackgroundRuns()) return true
    backgroundVersionRef.current++
    setBackgroundBusy(true)
    try {
      const status = await OrbitBackground.disable()
      backgroundEnabledRef.current = false
      setBackgroundStatus(status)
      toast('Background runs turned off; saved results remain available.')
      return true
    } catch { toast('Could not turn off background runs. Please try again.'); return false }
    finally { setBackgroundBusy(false) }
  }
  async function clearBackground(): Promise<boolean> {
    if (!supportsBackgroundRuns()) return true
    backgroundVersionRef.current++
    setBackgroundBusy(true)
    try {
      const status = await OrbitBackground.clear()
      backgroundEnabledRef.current = false
      setBackgroundStatus(status)
      return true
    } catch { toast('Could not clear Android background data. Please try again.'); return false }
    finally { setBackgroundBusy(false) }
  }
  async function requestBackgroundNotifications() {
    try {
      const permission = await OrbitBackground.requestNotifications()
      setBackgroundStatus(current => current ? { ...current, notificationsGranted: permission.granted } : current)
      toast(permission.granted ? 'Run notifications enabled' : 'Notifications are off. You can enable them in Android settings.')
    } catch { toast('Could not request notification permission.') }
  }
  function setApiKey(key: string) {
    setApiKeyState(key)
    apiKeyRef.current = key
    saveAIKey(key)
    if (supportsBackgroundRuns() && backgroundEnabledRef.current) {
      const version = backgroundVersionRef.current
      void OrbitBackground.updateKey({ apiKey: key }).then(async () => {
        const status = await OrbitBackground.status()
        if (version !== backgroundVersionRef.current) return
        backgroundEnabledRef.current = status.enabled
        setBackgroundStatus(status)
      }).catch(async () => {
        if (version !== backgroundVersionRef.current) return
        try { const status = await OrbitBackground.disable(); backgroundEnabledRef.current = false; setBackgroundStatus(status) }
        catch { /* The next resume will refresh the native state. */ }
        toast('Background key update failed. Background runs were turned off for safety.')
      })
    }
  }
  function navigate(next: Page) {
    setPage(next)
    setSelectedAgentId(null)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openAgent(id: string) {
    setPage('agents')
    setSelectedAgentId(id)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function startRun(agentId: string, goal: string, preview = false, scheduled = false) {
    const data = workspaceRef.current
    const agent = data.agents.find(item => item.id === agentId)
    if (!agent) return
    if (!preview && runningRef.current) { toast('Another agent is running. Try again in a moment.'); return }
    if (!preview) runningRef.current = true
    const runId = newId()
    const now = new Date().toISOString()
    const memories = data.memories.filter(memory => memory.agentId === agentId)
    // Unattended runs never offer connected APIs, even if a tool would not ask for permission.
    const tools = scheduled ? [] : data.integrations.filter(tool => tool.enabled && agent.toolIds.includes(tool.id))
    const run: AgentRun = {
      id: runId, agentId, goal: goal.trim(), output: '',
      status: preview ? 'preview' : 'running', steps: [], createdAt: now,
      source: scheduled ? 'schedule' : 'manual',
    }
    setWorkspace(current => ({
      ...current,
      runs: [run, ...current.runs],
      agents: preview ? current.agents : current.agents.map(item => item.id === agentId ? { ...item, lastRunAt: now } : item),
    }))
    if (!scheduled) { setRunComposerId(null); setResultId(runId) }
    else toast(`${agent.name} started a scheduled run`)

    if (preview) {
      const output = previewAgent(agent, goal, memories, tools)
      setWorkspace(current => ({ ...current, runs: current.runs.map(item => item.id === runId ? {
        ...item, output, steps: [{ id: newId(), label: 'Preview created locally', detail: 'No AI provider was contacted', status: 'done', createdAt: now }],
      } : item) }))
      return
    }

    try {
      const output = await executeAgent({
        agent, goal, memories, tools, settings: data.settings, apiKey: apiKeyRef.current,
        onApproval: scheduled ? undefined : (tool, input) => requestToolApproval(agent.name, tool, input),
        onStep: step => setWorkspace(current => ({ ...current, runs: current.runs.map(item => item.id === runId ? { ...item, steps: [...item.steps, step] } : item) })),
      })
      setWorkspace(current => current.agents.some(item => item.id === agentId) ? ({
        ...current,
        runs: current.runs.map(item => item.id === runId ? {
          ...item, output, status: 'completed',
          suggestedMemory: suggestMemory(goal, output), memoryReview: 'pending',
        } : item),
      }) : current)
      if (scheduled) toast(`${agent.name} finished its scheduled task`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.'
      setWorkspace(current => ({ ...current, runs: current.runs.map(item => item.id === runId ? {
        ...item, output: message, status: 'failed',
        steps: [...item.steps, { id: newId(), label: 'Run stopped', detail: message, status: 'error', createdAt: new Date().toISOString() }],
      } : item) }))
      if (scheduled) toast(`${agent.name} could not finish its scheduled task`)
    } finally {
      runningRef.current = false
    }
  }
  startRunRef.current = startRun

  function reviewMemory(runId: string, action: 'save' | 'dismiss', content?: string) {
    const run = workspaceRef.current.runs.find(item => item.id === runId)
    if (!run || !needsMemoryReview(run)) return
    if (action === 'save' && !content?.trim()) { toast('Add something worth remembering first.'); return }
    setWorkspace(current => {
      const currentRun = current.runs.find(item => item.id === runId)
      if (!currentRun || !needsMemoryReview(currentRun)) return current
      return {
        ...current,
        runs: current.runs.map(item => item.id === runId ? { ...item, memoryReview: action === 'save' ? 'saved' as const : 'dismissed' as const } : item),
        memories: action === 'save' ? [{ id: newId(), agentId: run.agentId, content: content!.trim(), kind: 'insight' as const, pinned: false, source: 'run' as const, createdAt: new Date().toISOString() }, ...current.memories] : current.memories,
      }
    })
    toast(action === 'save' ? 'Memory saved for future runs' : 'Suggestion dismissed')
  }

  const context = {
    workspace, setWorkspace, apiKey, setApiKey,
    background: { supported: supportsBackgroundRuns(), status: backgroundStatus, busy: backgroundBusy, enable: enableBackground, disable: disableBackground, clear: clearBackground, requestNotifications: requestBackgroundNotifications },
    page, selectedAgentId, navigate, openAgent,
    openAgentEditor: (id?: string) => setAgentEditorId(id ?? 'new'),
    openMemoryEditor: (id?: string) => setMemoryEditorId(id ?? 'new'),
    openIntegrationEditor: (id?: string) => setIntegrationEditorId(id ?? 'custom'),
    openRunComposer: (id: string) => setRunComposerId(id),
    openResult: (id: string) => setResultId(id),
    reviewMemory, startRun, toast,
  }
  const pendingMemoryCount = workspace.runs.filter(needsMemoryReview).length
  const currentAgent = selectedAgentId ? workspace.agents.find(item => item.id === selectedAgentId) : null
  const pageTitle = currentAgent?.name ?? ({ overview: 'Overview', agents: 'My agents', memory: 'Memory', integrations: 'Integrations', activity: 'Activity', settings: 'Settings' }[page])

  async function resetWorkspace() {
    if (!window.confirm('Reset your workspace? This removes all agents, memories, tools, and runs on this device. This cannot be undone.')) return
    if (!(await clearBackground())) return
    setWorkspace(initialWorkspace())
    setApiKey('')
    navigate('overview')
    toast('Workspace reset')
  }

  return <OrbitContext.Provider value={context}>
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-top"><Brand /><button className="icon-button sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ page: itemPage, label, icon: Icon }) => <button key={itemPage} className={`nav-item ${page === itemPage ? 'nav-item--active' : ''}`} onClick={() => navigate(itemPage)}>
            <Icon size={20} strokeWidth={1.9} /><span>{label}</span>{itemPage === 'agents' && <span className="nav-count">{workspace.agents.length}</span>}{itemPage === 'memory' && pendingMemoryCount > 0 && <span className="nav-count nav-count--attention" aria-label={`${pendingMemoryCount} memories to review`}>{pendingMemoryCount}</span>}
          </button>)}
        </nav>
        <div className="sidebar-divider" />
        <button className={`nav-item sidebar-settings ${page === 'settings' ? 'nav-item--active' : ''}`} onClick={() => navigate('settings')}><Settings2 size={20} strokeWidth={1.9} /><span>Settings</span></button>
        <div className="sidebar-spacer" />
        <div className="sidebar-promo">
          <span className="sidebar-promo-icon"><Sparkles size={18} /></span>
          <strong>Ideas need a sidekick.</strong>
          <p>Make an agent for the work on your mind.</p>
          <button onClick={() => { setMobileMenuOpen(false); setAgentEditorId('new') }}>Create an agent <ArrowRight size={15} /></button>
        </div>
        <button className="sidebar-profile" onClick={() => navigate('settings')}>
          <span className="profile-avatar">Y</span><span><strong>My workspace</strong><small>Personal plan</small></span><ChevronDown size={16} />
        </button>
      </aside>
      {mobileMenuOpen && <div className="mobile-menu-scrim" onClick={() => setMobileMenuOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
            <div className="mobile-brand"><Brand /></div>
            <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={15} /><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <button className="topbar-search" onClick={() => setSearchOpen(true)} aria-label="Search workspace"><Search size={18} /><span>Search anything...</span><kbd>⌘ K</kbd></button>
            <button className="icon-button topbar-help" onClick={() => toast('Tip: connect an AI provider in Settings, then run an agent.')} aria-label="Help"><CircleHelp size={20} /></button>
            <button className="icon-button topbar-bell" onClick={() => navigate('activity')} aria-label="View activity"><Bell size={20} />{(workspace.runs.some(run => run.status === 'running') || pendingMemoryCount > 0) && <span className="notification-dot" />}</button>
            <button className="topbar-profile" onClick={() => navigate('settings')} aria-label="Open settings"><span className="profile-avatar">Y</span></button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {currentAgent ? <AgentDetailPage agent={currentAgent} /> : <>
            {page === 'overview' && <OverviewPage />}
            {page === 'agents' && <AgentsPage />}
            {page === 'memory' && <MemoryPage />}
            {page === 'integrations' && <IntegrationsPage />}
            {page === 'activity' && <ActivityPage />}
            {page === 'settings' && <SettingsPage onReset={resetWorkspace} />}
          </>}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <button className={page === 'overview' ? 'active' : ''} onClick={() => navigate('overview')}><LayoutDashboard size={21} /><span>Home</span></button>
        <button className={page === 'agents' ? 'active' : ''} onClick={() => navigate('agents')}><Bot size={21} /><span>Agents</span></button>
        <button className="bottom-create" onClick={() => setAgentEditorId('new')} aria-label="Create agent"><Plus size={23} strokeWidth={2.3} /></button>
        <button className={page === 'memory' ? 'active' : ''} onClick={() => navigate('memory')}><Brain size={21} /><span>Memory</span>{pendingMemoryCount > 0 && <i className="bottom-badge" aria-label={`${pendingMemoryCount} memories to review`} />}</button>
        <button className={page === 'integrations' ? 'active' : ''} onClick={() => navigate('integrations')}><Wrench size={21} /><span>Tools</span></button>
      </nav>

      {agentEditorId && <AgentEditor key={agentEditorId} id={agentEditorId} onClose={() => setAgentEditorId(null)} />}
      {memoryEditorId && <MemoryEditor key={memoryEditorId} id={memoryEditorId} onClose={() => setMemoryEditorId(null)} />}
      {integrationEditorId && <IntegrationEditor key={integrationEditorId} id={integrationEditorId} onClose={() => setIntegrationEditorId(null)} />}
      {runComposerId && <RunComposer key={runComposerId} agentId={runComposerId} onClose={() => setRunComposerId(null)} />}
      {resultId && <ResultDialog id={resultId} onClose={() => setResultId(null)} />}
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      {toolApproval && <ToolApprovalDialog tool={toolApproval.tool} input={toolApproval.input} agentName={toolApproval.agentName} onDecision={toolApproval.decide} />}
      {toastMessage && <div className="toast" role="status"><Sparkles size={17} />{toastMessage}<button onClick={() => setToastMessage('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </div>
  </OrbitContext.Provider>
}
