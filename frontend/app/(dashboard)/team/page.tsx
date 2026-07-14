"use client"

import { useState } from "react"
import { useTranslation } from "@/src/context/I18nContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Mail,
  MoreVertical,
  Shield,
  Crown,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  Trash2,
  Edit,
} from "lucide-react"
import type { TeamMember, TeamInvitation, Permission, Role } from "@/lib/types/team"
import type { TeamMemberRole } from "@/lib/types/team" // Declare the TeamMemberRole variable

// Mock data
const mockPermissions: Permission[] = [
  { id: "products.view", name: "View Products", description: "View product listings", category: "products" },
  { id: "products.create", name: "Create Products", description: "Add new products", category: "products" },
  { id: "products.edit", name: "Edit Products", description: "Modify existing products", category: "products" },
  { id: "products.delete", name: "Delete Products", description: "Remove products", category: "products" },
  { id: "orders.view", name: "View Orders", description: "View order listings", category: "orders" },
  { id: "orders.edit", name: "Manage Orders", description: "Update order status", category: "orders" },
  {
    id: "conversations.view",
    name: "View Conversations",
    description: "View customer chats",
    category: "conversations",
  },
  {
    id: "conversations.reply",
    name: "Reply to Conversations",
    description: "Respond to customers",
    category: "conversations",
  },
  { id: "analytics.view", name: "View Analytics", description: "Access reports and analytics", category: "analytics" },
  { id: "bots.view", name: "View Bots", description: "View bot configurations", category: "bots" },
  { id: "bots.manage", name: "Manage Bots", description: "Configure and control bots", category: "bots" },
  { id: "team.view", name: "View Team", description: "View team members", category: "team" },
  { id: "team.invite", name: "Invite Members", description: "Send team invitations", category: "team" },
  { id: "team.manage", name: "Manage Team", description: "Edit member roles and permissions", category: "team" },
  { id: "billing.view", name: "View Billing", description: "View billing information", category: "billing" },
  { id: "billing.manage", name: "Manage Billing", description: "Update billing and plans", category: "billing" },
  { id: "settings.view", name: "View Settings", description: "View organization settings", category: "settings" },
  { id: "settings.manage", name: "Manage Settings", description: "Update organization settings", category: "settings" },
]

const mockRoles: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all features and settings",
    permissions: mockPermissions,
    isDefault: true,
    isCustom: false,
  },
  {
    id: "manager",
    name: "Manager",
    description: "Manage products, orders, and team members",
    permissions: mockPermissions.filter((p) => !p.id.includes("billing") && !p.id.includes("settings.manage")),
    isDefault: true,
    isCustom: false,
  },
  {
    id: "operator",
    name: "Operator",
    description: "Handle customer conversations and basic order management",
    permissions: mockPermissions.filter((p) =>
      ["products.view", "orders.view", "orders.edit", "conversations.view", "conversations.reply"].includes(p.id),
    ),
    isDefault: true,
    isCustom: false,
  },
]

const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    avatar: "/diverse-user-avatars.png",
    role: "admin",
    status: "active",
    permissions: mockRoles[0].permissions,
    invitedBy: "system",
    invitedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(Date.now() - 5 * 60 * 1000),
    departments: ["Management"],
  },
  {
    id: "2",
    email: "sarah.wilson@example.com",
    firstName: "Sarah",
    lastName: "Wilson",
    avatar: "/diverse-user-avatars.png",
    role: "manager",
    status: "active",
    permissions: mockRoles[1].permissions,
    invitedBy: "1",
    invitedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    joinedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    departments: ["Sales", "Support"],
  },
  {
    id: "3",
    email: "mike.johnson@example.com",
    firstName: "Mike",
    lastName: "Johnson",
    role: "operator",
    status: "active",
    permissions: mockRoles[2].permissions,
    invitedBy: "1",
    invitedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(Date.now() - 30 * 60 * 1000),
    departments: ["Support"],
  },
  {
    id: "4",
    email: "anna.smith@example.com",
    firstName: "Anna",
    lastName: "Smith",
    role: "operator",
    status: "pending",
    permissions: mockRoles[2].permissions,
    invitedBy: "2",
    invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    departments: ["Support"],
  },
]

const mockInvitations: TeamInvitation[] = [
  {
    id: "inv-1",
    email: "anna.smith@example.com",
    role: "operator",
    permissions: ["products.view", "orders.view", "conversations.view", "conversations.reply"],
    invitedBy: "2",
    invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "pending",
    token: "inv_token_123",
  },
  {
    id: "inv-2",
    email: "david.brown@example.com",
    role: "manager",
    permissions: mockRoles[1].permissions.map((p) => p.id),
    invitedBy: "1",
    invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "expired",
    token: "inv_token_456",
  },
]

export default function TeamPage() {
  const { t } = useTranslation()
  const [teamMembers] = useState(mockTeamMembers)
  const [invitations] = useState(mockInvitations)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "operator" as TeamMemberRole,
    message: "",
    permissions: [] as string[],
  })

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "manager":
        return <Shield className="h-4 w-4 text-blue-500" />
      case "operator":
        return <User className="h-4 w-4 text-primary" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: t("team.status.active"), color: "bg-primary", icon: CheckCircle },
      pending: { label: t("team.status.pending"), color: "bg-yellow-500", icon: Clock },
      suspended: { label: t("team.status.suspended"), color: "bg-red-500", icon: XCircle },
      expired: { label: t("team.status.expired"), color: "bg-gray-500", icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge variant="outline" className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatLastActive = (date?: Date) => {
    if (!date) return t("team.lastActive.never")
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return t("team.lastActive.minutesAgo", { count: minutes })
    if (hours < 24) return t("team.lastActive.hoursAgo", { count: hours })
    if (days < 30) return t("team.lastActive.daysAgo", { count: days })
    return date.toLocaleDateString()
  }

  const handleInvite = () => {
    console.log("Inviting member:", inviteForm)
    setIsInviteDialogOpen(false)
    setInviteForm({ email: "", role: "operator", message: "", permissions: [] })
  }

  const handleRoleChange = (role: TeamMemberRole) => {
    const selectedRole = mockRoles.find((r) => r.id === role)
    setInviteForm({
      ...inviteForm,
      role,
      permissions: selectedRole ? selectedRole.permissions.map((p) => p.id) : [],
    })
  }

  const groupedPermissions = mockPermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('team.title')}</h1>
          <p className="text-muted-foreground">{t('team.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <LanguageSwitcher />
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('team.inviteMember')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('team.inviteDialog.title')}</DialogTitle>
              <DialogDescription>{t('team.inviteDialog.desc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('team.inviteDialog.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('team.inviteDialog.emailPlaceholder')}
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('team.inviteDialog.roleLabel')}</Label>
                <Select value={inviteForm.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.id)}
                          <div>
                            <div className="font-medium">{role.name}</div>
                            <div className="text-xs text-muted-foreground">{role.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('team.inviteDialog.permissionsLabel')}</Label>
                <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {Object.entries(groupedPermissions).map(([category, permissions]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium capitalize">{category}</h4>
                      <div className="space-y-2 ml-4">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={inviteForm.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setInviteForm({
                                    ...inviteForm,
                                    permissions: [...inviteForm.permissions, permission.id],
                                  })
                                } else {
                                  setInviteForm({
                                    ...inviteForm,
                                    permissions: inviteForm.permissions.filter((p) => p !== permission.id),
                                  })
                                }
                              }}
                            />
                            <Label htmlFor={permission.id} className="text-sm">
                              <div>{permission.name}</div>
                              <div className="text-xs text-muted-foreground">{permission.description}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t('team.inviteDialog.messageLabel')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('team.inviteDialog.messagePlaceholder')}
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  {t('team.inviteDialog.cancel')}
                </Button>
                <Button onClick={handleInvite}>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('team.inviteDialog.send')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">{t('team.tabs.members')}</TabsTrigger>
          <TabsTrigger value="invitations">{t('team.tabs.invitations')}</TabsTrigger>
          <TabsTrigger value="roles">{t('team.tabs.roles')}</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('team.membersCard.title', { count: teamMembers.length })}</CardTitle>
              <CardDescription>{t('team.membersCard.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('team.table.member')}</TableHead>
                    <TableHead>{t('team.table.role')}</TableHead>
                    <TableHead>{t('team.table.status')}</TableHead>
                    <TableHead>{t('team.table.departments')}</TableHead>
                    <TableHead>{t('team.table.lastActive')}</TableHead>
                    <TableHead className="text-right">{t('team.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {member.firstName[0]}
                              {member?.lastName[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.firstName} {member?.lastName || ""}
                            </div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {member.departments.map((dept) => (
                            <Badge key={dept} variant="secondary" className="text-xs">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatLastActive(member.lastActiveAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member)
                                setIsEditMemberDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('team.actions.editMember')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="h-4 w-4 mr-2" />
                              {t('team.actions.managePermissions')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('team.actions.removeMember')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('team.invitationsCard.title', { count: invitations.length })}</CardTitle>
              <CardDescription>{t('team.invitationsCard.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('team.table.email')}</TableHead>
                    <TableHead>{t('team.table.role')}</TableHead>
                    <TableHead>{t('team.table.status')}</TableHead>
                    <TableHead>{t('team.table.invitedBy')}</TableHead>
                    <TableHead>{t('team.table.sent')}</TableHead>
                    <TableHead>{t('team.table.expires')}</TableHead>
                    <TableHead className="text-right">{t('team.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const inviter = teamMembers.find((m) => m.id === invitation.invitedBy)
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(invitation.role)}
                            <span className="capitalize">{invitation.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>{inviter ? `${inviter.firstName} ${inviter.lastName}` : t('team.unknown')}</TableCell>
                        <TableCell>{invitation.invitedAt.toLocaleDateString()}</TableCell>
                        <TableCell>{invitation.expiresAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                {t('team.actions.resendInvitation')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <XCircle className="h-4 w-4 mr-2" />
                                {t('team.actions.cancelInvitation')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {mockRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getRoleIcon(role.id)}
                    {role.name}
                    {role.isDefault && <Badge variant="secondary">{t('team.rolesCard.default')}</Badge>}
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t('team.rolesCard.permissionsCount', { count: role.permissions.length })}</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(
                        role.permissions.reduce(
                          (acc, permission) => {
                            if (!acc[permission.category]) {
                              acc[permission.category] = []
                            }
                            acc[permission.category].push(permission)
                            return acc
                          },
                          {} as Record<string, Permission[]>,
                        ),
                      ).map(([category, permissions]) => (
                        <div key={category} className="text-xs">
                          <div className="font-medium capitalize text-muted-foreground">{category}</div>
                          <div className="ml-2 space-y-0.5">
                            {permissions.map((permission) => (
                              <div key={permission.id} className="text-muted-foreground">
                                • {permission.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {role.isCustom && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        {t('team.rolesCard.editRole')}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 bg-transparent">
                        {t('team.rolesCard.delete')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('team.editDialog.title')}</DialogTitle>
            <DialogDescription>{t('team.editDialog.desc')}</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedMember.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {selectedMember.firstName[0]}
                    {selectedMember?.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {selectedMember.firstName} {selectedMember?.lastName || ""}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedMember.email}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('team.editDialog.roleLabel')}</Label>
                <Select value={selectedMember.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.id)}
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('team.editDialog.statusLabel')}</Label>
                <Select value={selectedMember.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('team.editDialog.statusActive')}</SelectItem>
                    <SelectItem value="suspended">{t('team.editDialog.statusSuspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditMemberDialogOpen(false)}>
                  {t('team.editDialog.cancel')}
                </Button>
                <Button>{t('team.editDialog.save')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
