"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
// import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Bell, Key, User, Shield, Upload, Copy, Eye, EyeOff, Plus, Trash2, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"
import { useOrganizationQuery, useUpdateOrganizationMutation } from "@/src/hooks/useOrganization"
import { useUserQuery, useUpdateProfileMutation, useUpdatePasswordMutation } from "@/src/hooks/useUser"
import { useSchemaQuery } from "@/src/hooks/useSchema"
import { ProductSchemaSection } from "@/components/settings/product-schema-section"
import { toast } from "sonner"
import { filesApi } from "@/src/api/filesApi"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "@/src/context/I18nContext"

export default function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  // Organization hooks
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrganizationQuery()
  const updateOrgMutation = useUpdateOrganizationMutation()
  
  // User hooks
  const { data: user, isLoading: userLoading, error: userError } = useUserQuery()
  const updateProfileMutation = useUpdateProfileMutation()
  const updatePasswordMutation = useUpdatePasswordMutation()
  
  // Schema hooks
  const { data: schema } = useSchemaQuery()
  
  // Form state for organization
  const [orgFormData, setOrgFormData] = useState<{
    name: string
    description: string
    category: "ELECTRONICS" | "FASHION" | "COSMETICS" | "SERVICES" | "FOOD" | "BOOKS" | "HOME" | "SPORTS" | "AUTOMOTIVE" | "OTHER"
  }>({
    name: "",
    description: "",
    category: "OTHER",
  })

  const [orgLogoTemp, setOrgLogoTemp] = useState<{ id: number; key: string; url: string } | null>(null)
  const [orgLogoUploading, setOrgLogoUploading] = useState(false)
  const orgFileInputRef = useRef<HTMLInputElement | null>(null)

  // Update form data when organization loads
  useEffect(() => {
    if (organization) {
      setOrgFormData({
        name: organization.name || "",
        description: organization.description || "",
        category: organization.category as typeof orgFormData.category,
      })
      setOrgLogoTemp(null)
    }
  }, [organization])

  const handleSaveOrganization = async () => {
    if (!organization) return

    const hasChanges =
      orgFormData.name !== organization.name ||
      orgFormData.description !== (organization.description || "") ||
      orgFormData.category !== organization.category ||
      (orgLogoTemp ? orgLogoTemp.id : organization.logo?.id) !== organization.logo?.id

    if (!hasChanges) {
      toast.info(t("settings.toasts.noChanges"))
      return
    }

    await updateOrgMutation.mutateAsync({
      id: organization.id,
      payload: {
        name: orgFormData.name,
        description: orgFormData.description || undefined,
        category: orgFormData.category,
        ...(orgLogoTemp ? { logoId: orgLogoTemp.id } : {}),
      },
    })
    setOrgLogoTemp(null)
  }

  // Form state for profile
  const [profileFormData, setProfileFormData] = useState({
    firstName: "",
    lastName: "",
  })

  const [profileLogoTemp, setProfileLogoTemp] = useState<{ id: number; key: string; url: string } | null>(null)
  const [profileLogoUploading, setProfileLogoUploading] = useState(false)
  const profileFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (user) {
      setProfileFormData({
        firstName: user.firstName || "",
        lastName: user?.lastName || "",
      })
      setProfileLogoTemp(null)
    }
  }, [user])

  // Profile save handler
  const handleSaveProfile = async () => {
    if (!user) return

    const payload: any = {}
    if (profileFormData.firstName !== (user.firstName || "")) {
      payload.firstName = profileFormData.firstName.trim() || null
    }
    if (profileFormData?.lastName !== (user.lastName || "")) {
      payload.lastName = profileFormData.lastName.trim() || null
    }
    if ((profileLogoTemp ? profileLogoTemp.id : user.logo?.id) !== user.logo?.id) {
      payload.logoId = profileLogoTemp ? profileLogoTemp.id : null
    }

    if (Object.keys(payload).length === 0) {
      toast.info(t("settings.toasts.noChanges"))
      return
    }

    await updateProfileMutation.mutateAsync(payload)
    setProfileLogoTemp(null)
  }

  // Password state
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  })

  const handleUpdatePassword = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      toast.error(t("settings.security.missingFields"))
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error(t("settings.security.passwordRequirement"))
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("settings.security.passwordMismatch"))
      return
    }

    await updatePasswordMutation.mutateAsync(
      {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      },
      {
        onSuccess: () => {
          setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" })
        },
      }
    )
  }

  const getLogoUrl = (logo: { id: number; key: string; url?: string }) => {
    if (logo.url) return logo.url
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${logo.key}`
  }

  const onPickProfileLogo = async (file: File) => {
    if (!file) return
    const accepted = ["image/png", "image/jpeg", "image/webp"]
    if (!accepted.includes(file.type)) {
      toast.error(t("settings.toasts.invalidFileType"))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.toasts.maxFileSize"))
      return
    }
    try {
      setProfileLogoUploading(true)
      const uploaded = await filesApi.uploadFile(file)
      setProfileLogoTemp({ id: uploaded.id, key: uploaded.key, url: uploaded.url })
      await updateProfileMutation.mutateAsync({ logoId: uploaded.id })
      setProfileLogoTemp(null)
      toast.success(t("settings.toasts.profilePhotoUpdated"))
    } catch (e) {
      toast.error(t("settings.toasts.uploadFailed"))
    } finally {
      setProfileLogoUploading(false)
    }
  }

  const onRemoveProfileLogo = async () => {
    if (!user) return
    await updateProfileMutation.mutateAsync({ logoId: null })
    setProfileLogoTemp(null)
  }

  const onPickOrgLogo = async (file: File) => {
    if (!organization) return
    if (!file) return
    const accepted = ["image/png", "image/jpeg", "image/webp"]
    if (!accepted.includes(file.type)) {
      toast.error(t("settings.toasts.invalidFileType"))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.toasts.maxFileSize"))
      return
    }
    try {
      setOrgLogoUploading(true)
      const uploaded = await filesApi.uploadFile(file)
      setOrgLogoTemp({ id: uploaded.id, key: uploaded.key, url: uploaded.url })
      await updateOrgMutation.mutateAsync({ id: organization.id, payload: { logoId: uploaded.id } })
      setOrgLogoTemp(null)
      toast.success(t("settings.toasts.orgLogoUpdated"))
    } catch (e) {
      toast.error(t("settings.toasts.uploadFailed"))
    } finally {
      setOrgLogoUploading(false)
    }
  }

  const onRemoveOrgLogo = async () => {
    if (!organization) return
    await updateOrgMutation.mutateAsync({ id: organization.id, payload: { logoId: null } })
    setOrgLogoTemp(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t("settings.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("settings.pageSubtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Tabs: Profile first, then Organization */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          {/* 1st Tab: Profile */}
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("settings.tabs.profile")}
          </TabsTrigger>
          {/* 2nd Tab: Organization */}
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t("settings.tabs.organization")}
          </TabsTrigger>
          {/* The rest */}
          {/* <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger> */}
          {/* <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger> */}
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("settings.tabs.security")}
          </TabsTrigger>
        </TabsList>

        {/* Profile TAB (now first tab) */}
        <TabsContent value="profile" className="space-y-6">
          {userLoading ? (
            <Card className="lp-glass-card">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : userError ? (
            <Alert variant="destructive">
              <AlertDescription>{t("settings.errors.user")}</AlertDescription>
            </Alert>
          ) : user ? (
            <Card className="lp-glass-card">
              <CardHeader>
                <CardTitle>{t("settings.profile.cardTitle")}</CardTitle>
                <CardDescription>{t("settings.profile.cardDescription")}</CardDescription>
              </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        {
                          (profileLogoTemp || user.logo) ? (
                            <AvatarImage src={getLogoUrl((profileLogoTemp || user.logo) as { id: number; key: string; url?: string })} />
                          ) : (
                            <AvatarFallback>{user.firstName.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
                          )
                        }
                    </Avatar>
                <div className="space-y-2">
                  <Label>{t("settings.profile.pictureLabel")}</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      ref={profileFileInputRef}
                      id="profile-logo-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      multiple={false}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onPickProfileLogo(f)
                        e.currentTarget.value = ""
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={profileLogoUploading}
                      onClick={() => profileFileInputRef.current?.click()}
                    >
                      <span className="inline-flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        {profileLogoUploading ? t("settings.profile.uploading") : t("settings.profile.changePhoto")}
                      </span>
                    </Button>
                    {(profileLogoTemp || user.logo) && (
                      <Button variant="ghost" size="sm" onClick={onRemoveProfileLogo}>
                        {t("settings.profile.removePhoto")}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("settings.profile.uploadHint")}</p>
                </div>
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">{t("settings.profile.firstName")}</Label>
                    <Input
                      id="first-name"
                      value={profileFormData.firstName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">{t("settings.profile.lastName")}</Label>
                    <Input
                      id="last-name"
                      value={profileFormData.lastName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">{t("settings.profile.email")}</Label>
                    <Input id="user-email" type="email" value={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-id">{t("settings.profile.userId")}</Label>
                    <Input id="user-id" value={user.id.toString()} disabled />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t("settings.profile.preferencesTitle")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">{t("settings.profile.themeLabel")}</Label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">{t("settings.profile.themeOptions.light")}</SelectItem>
                          <SelectItem value="dark">{t("settings.profile.themeOptions.dark")}</SelectItem>
                          <SelectItem value="system">{t("settings.profile.themeOptions.system")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">{t("settings.profile.languageLabel")}</Label>
                      <div className="flex h-10 items-center">
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending || profileLogoUploading}
                >
                  {updateProfileMutation.isPending ? t("settings.profile.saving") : t("settings.profile.save")}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Organization TAB (now second tab) */}
        <TabsContent value="organization" className="space-y-6">
          {orgLoading ? (
            <Card className="lp-glass-card">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : orgError ? (
            <Alert variant="destructive">
              <AlertDescription>{t("settings.errors.organization")}</AlertDescription>
            </Alert>
          ) : organization ? (
            <>
              <Card className="lp-glass-card">
                <CardHeader>
                  <CardTitle>{t("settings.organization.cardTitle")}</CardTitle>
                  <CardDescription>{t("settings.organization.cardDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      { (orgLogoTemp || organization.logo) ? (
                        <AvatarImage src={getLogoUrl((orgLogoTemp || organization.logo) as { id: number; key: string; url?: string })} />
                      ) : (
                        <AvatarFallback>{organization.name.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="space-y-2">
                      <Label>{t("settings.organization.logoLabel")}</Label>
                      <div className="flex gap-2">
                        <input
                          ref={orgFileInputRef}
                          id="org-logo-input"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          multiple={false}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) onPickOrgLogo(f)
                            e.currentTarget.value = ""
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={orgLogoUploading}
                          onClick={() => orgFileInputRef.current?.click()}
                        >
                          <span className="inline-flex items-center">
                            <Upload className="h-4 w-4 mr-2" />
                            {orgLogoUploading ? t("settings.profile.uploading") : t("settings.organization.changeLogo")}
                          </span>
                        </Button>
                        {(orgLogoTemp || organization.logo) && (
                          <Button variant="ghost" size="sm" onClick={onRemoveOrgLogo}>
                            {t("settings.organization.removeLogo")}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{t("settings.organization.uploadHint")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">{t("settings.organization.nameLabel")}</Label>
                      <Input
                        id="org-name"
                        value={orgFormData.name}
                        onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">{t("settings.organization.categoryLabel")}</Label>
                      <Select
                        value={orgFormData.category.toLowerCase()}
                        onValueChange={(value) => setOrgFormData({ ...orgFormData, category: value.toUpperCase() as any })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("settings.organization.categoryPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">{t("settings.organization.categories.electronics")}</SelectItem>
                          <SelectItem value="fashion">{t("settings.organization.categories.fashion")}</SelectItem>
                          <SelectItem value="cosmetics">{t("settings.organization.categories.cosmetics")}</SelectItem>
                          <SelectItem value="services">{t("settings.organization.categories.services")}</SelectItem>
                          <SelectItem value="food">{t("settings.organization.categories.food")}</SelectItem>
                          <SelectItem value="books">{t("settings.organization.categories.books")}</SelectItem>
                          <SelectItem value="home">{t("settings.organization.categories.home")}</SelectItem>
                          <SelectItem value="sports">{t("settings.organization.categories.sports")}</SelectItem>
                          <SelectItem value="automotive">{t("settings.organization.categories.automotive")}</SelectItem>
                          <SelectItem value="other">{t("settings.organization.categories.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t("settings.organization.descriptionLabel")}</Label>
                    <Textarea
                      id="description"
                      placeholder={t("settings.organization.descriptionPlaceholder")}
                      value={orgFormData.description}
                      onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                    />
                  </div>

                  <Button
                    onClick={handleSaveOrganization}
                    disabled={updateOrgMutation.isPending || orgLogoUploading}
                  >
                    {updateOrgMutation.isPending ? t("settings.organization.saving") : t("settings.organization.save")}
                  </Button>
                </CardContent>
              </Card>

              {/* Product Schema Section */}
              {schema && (
                <Card className="lp-glass-card">
                  <CardHeader>
                    <CardTitle>{t("settings.organization.productSchemaTitle")}</CardTitle>
                    <CardDescription>{t("settings.organization.productSchemaDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductSchemaSection schemaId={schema.id} />
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* Security TAB remains unchanged */}
        <TabsContent value="security" className="space-y-6">
          <Card className="lp-glass-card">
            <CardHeader>
              <CardTitle>{t("settings.security.cardTitle")}</CardTitle>
              <CardDescription>{t("settings.security.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t("settings.security.passwordTitle")}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t("settings.security.currentPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords.old ? "text" : "password"}
                      value={passwordData.oldPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, oldPassword: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, old: !showPasswords.old })
                      }
                    >
                      {showPasswords.old ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("settings.security.newPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                      }
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordData.newPassword && passwordData.newPassword.length < 8 && (
                    <p className="text-sm text-muted-foreground">
                      {t("settings.security.passwordRequirement")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("settings.security.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordData.confirmPassword &&
                    passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-sm text-destructive">{t("settings.security.passwordMismatch")}</p>
                    )}
                </div>

                <Button
                  onClick={handleUpdatePassword}
                  disabled={updatePasswordMutation.isPending}
                  variant="outline"
                >
                  {updatePasswordMutation.isPending ? t("settings.security.updating") : t("settings.security.update")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
