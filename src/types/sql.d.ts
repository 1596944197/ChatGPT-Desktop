type Role = 'system' | 'user' | 'assistant'

export type TableName = 'session' | 'session_data' | 'role' | 'credit'

export interface MessageData {
  role: Role
  content: string
}
export interface RolePayload {
  id?: number
  name: string
  description: string
  is_default?: boolean
  is_deleted?: boolean
  isEdit?: boolean
}

export type MessageType = 'text' | 'image' | 'voice'

export interface SessionData {
  id?: number
  session_id: string
  is_ask: boolean
  is_memory: boolean
  message_type: MessageType
  message: MessageData
  time?: string
}

export interface SessionPayload {
  id: string
  title: string
  role_id: number
  update_time?: string
  name?: string
  isEdit?: boolean
}

export interface RolePayload {
  id?: number
  name: string
  description: string
  is_default?: boolean
}

export interface CreditPayload {
  id?: number
  history_id: number
  token_cost: number
  api_key: string
}

export type TablePayload =
  | SessionData
  | SessionPayload
  | RolePayload
  | CreditPayload

type MergedTablePayload = SessionData &
  SessionPayload &
  RolePayload &
  CreditPayload

export interface WherePayload {
  key: keyof Partial<MergedTablePayload>
  value: any
}
