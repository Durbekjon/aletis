export interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: "admin" | "manager" | "operator"
  status: "active" | "pending" | "suspended"
  permissions: Permission[]
  invitedBy: string
  invitedAt: Date
  joinedAt?: Date
  lastActiveAt?: Date
  departments: string[]
}

export interface Permission {
  id: string
  name: string
  description: string
  category: "products" | "orders" | "conversations" | "analytics" | "bots" | "billing" | "team" | "settings"
}

export interface TeamInvitation {
  id: string
  email: string
  role: "admin" | "manager" | "operator"
  permissions: string[]
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  status: "pending" | "accepted" | "expired" | "cancelled"
  token: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isDefault: boolean
  isCustom: boolean
}

export type TeamMemberRole = TeamMember["role"]
export type TeamMemberStatus = TeamMember["status"]
export type InvitationStatus = TeamInvitation["status"]
