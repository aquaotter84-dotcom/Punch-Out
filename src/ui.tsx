import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Bot, Code2, Database, Globe2, Mail, Orbit, PenLine, Radar, Search, Sparkles, Webhook, MessageSquare, type LucideIcon } from 'lucide-react'
import type { Agent, AgentIcon, Integration } from './types'

const agentIcons: Record<AgentIcon, LucideIcon> = {
  sparkles: Sparkles, search: Search, pen: PenLine, radar: Radar, code: Code2, mail: Mail,
}

const toolIcons: Record<Integration['icon'], LucideIcon> = {
  globe: Globe2, search: Search, webhook: Webhook, slack: MessageSquare, database: Database,
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-symbol"><Orbit size={24} strokeWidth={2.1} /></span>{!compact && <span className="brand-name">orbit<span>.</span></span>}</div>
}

export function AgentAvatar({ agent, size = 'regular' }: { agent: Agent; size?: 'tiny' | 'regular' | 'large' }) {
  const Icon = agentIcons[agent.icon] ?? Bot
  return <span className={`agent-avatar agent-avatar--${agent.color} agent-avatar--${size}`} aria-hidden="true"><Icon strokeWidth={2.05} /></span>
}

export function ToolAvatar({ icon, size = 'regular' }: { icon: Integration['icon']; size?: 'regular' | 'small' }) {
  const Icon = toolIcons[icon] ?? Globe2
  return <span className={`tool-avatar tool-avatar--${icon} tool-avatar--${size}`} aria-hidden="true"><Icon size={size === 'small' ? 17 : 22} strokeWidth={1.9} /></span>
}

export function timeAgo(date: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fullDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Modal({ title, subtitle, children, onClose, wide = false, priority = false, className = '' }: {
  title?: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean; priority?: boolean; className?: string
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const dialog = dialogRef.current
    if (!openerRef.current && document.activeElement instanceof HTMLElement && !dialog?.contains(document.activeElement)) openerRef.current = document.activeElement
    document.body.style.overflow = 'hidden'
    if (dialog && !dialog.contains(document.activeElement)) dialog.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea, select')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      // Only the frontmost dialog responds when an approval opens above a run or editor.
      const backdrops = document.querySelectorAll('.modal-backdrop')
      const front = document.querySelector('.modal-backdrop--priority') ?? backdrops[backdrops.length - 1]
      if (!front?.contains(dialogRef.current)) return
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(element => !element.hasAttribute('hidden'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      if (openerRef.current?.isConnected) openerRef.current.focus()
    }
  }, [])
  return <div className={`modal-backdrop ${priority ? 'modal-backdrop--priority' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialogRef} className={`modal ${wide ? 'modal--wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title ?? 'Dialog'}>
      {(title || subtitle) && <div className="modal-heading"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog">×</button></div>}
      {children}
    </div>
  </div>
}
