import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { Page, Workspace } from './types'
import type { BackgroundStatus } from './background'

export interface OrbitContextValue {
  workspace: Workspace
  setWorkspace: Dispatch<SetStateAction<Workspace>>
  apiKey: string
  setApiKey: (key: string) => void
  background: {
    supported: boolean
    status: BackgroundStatus | null
    busy: boolean
    enable: () => Promise<void>
    disable: () => Promise<boolean>
    clear: () => Promise<boolean>
    requestNotifications: () => Promise<void>
  }
  page: Page
  selectedAgentId: string | null
  navigate: (page: Page) => void
  openAgent: (id: string) => void
  openAgentEditor: (id?: string) => void
  openMemoryEditor: (id?: string) => void
  openIntegrationEditor: (id?: string) => void
  openRunComposer: (id: string) => void
  openResult: (id: string) => void
  reviewMemory: (runId: string, action: 'save' | 'dismiss', content?: string) => void
  startRun: (agentId: string, goal: string, preview?: boolean, scheduled?: boolean) => Promise<void>
  toast: (message: string) => void
}

export const OrbitContext = createContext<OrbitContextValue | null>(null)
export function useOrbit(): OrbitContextValue {
  const context = useContext(OrbitContext)
  if (!context) throw new Error('Orbit context is missing')
  return context
}
