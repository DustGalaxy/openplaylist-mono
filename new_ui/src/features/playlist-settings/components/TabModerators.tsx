import React, { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  KeyRound,
  Link as LinkIcon,
  ListMusic,
  Play,
  Plus,
  Settings,
  Shield,
  Trash2,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createModeratorToken,
  addModeratorByUserId,
  fetchModerators,
  revokeModerator,
  updateModerator,
} from '@/api/api-moderators'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import type {
  ModeratorItemResponse,
  ModeratorPermissions,
} from '@/types/moderator'

export default function TabModerators() {
  const { t, tc } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()

  const [moderators, setModerators] = useState<ModeratorItemResponse[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [creating, setCreating] = useState<boolean>(false)

  // Add Mode: 'token' link vs 'direct' user assignment
  const [addMode, setAddMode] = useState<'token' | 'direct'>('token')

  // Form State
  const [name, setName] = useState<string>('')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [permissions, setPermissions] = useState<ModeratorPermissions>({
    can_manage_queue: true,
    can_manage_playback: true,
    can_manage_settings: false,
  })
  const [expiresIn, setExpiresIn] = useState<string>('never')

  // Freshly created link state
  const [latestCreatedToken, setLatestCreatedToken] = useState<string | null>(
    null,
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Edit Modal State
  const [editingMod, setEditingMod] = useState<ModeratorItemResponse | null>(
    null,
  )
  const [editName, setEditName] = useState<string>('')
  const [editPermissions, setEditPermissions] = useState<ModeratorPermissions>({
    can_manage_queue: true,
    can_manage_playback: true,
    can_manage_settings: false,
  })
  const [editIsActive, setEditIsActive] = useState<boolean>(true)
  const [savingEdit, setSavingEdit] = useState<boolean>(false)

  const loadModerators = async () => {
    if (!playlist?.id) return
    try {
      setLoading(true)
      const data = await fetchModerators(playlist.id)
      setModerators(data || [])
    } catch {
      toast.error(
        t(
          'playlistSettings.moderation.loadFailed',
          'Не удалось загрузить список модераторов',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModerators()
  }, [playlist?.id])

  const calculateExpiresAt = (option: string): string | null => {
    if (option === 'never') return null
    const now = new Date()
    if (option === '24h') now.setHours(now.getHours() + 24)
    if (option === '7d') now.setDate(now.getDate() + 7)
    if (option === '30d') now.setDate(now.getDate() + 30)
    return now.toISOString()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlist?.id) return

    const expiresAt = calculateExpiresAt(expiresIn)

    try {
      setCreating(true)
      if (addMode === 'token') {
        const linkName =
          name.trim() ||
          t('playlistSettings.moderation.defaultName', 'Модератор ссылки')
        const newMod = await createModeratorToken(playlist.id, {
          name: linkName,
          permissions,
          expires_at: expiresAt,
        })
        setLatestCreatedToken(newMod.token)
        setName('')
        toast.success(
          t(
            'playlistSettings.moderation.createdSuccess',
            'Ссылка модератора успешно создана!',
          ),
        )
      } else {
        if (!targetUserId.trim()) {
          toast.error(
            t(
              'playlistSettings.moderation.enterUserId',
              'Укажите User ID пользователя',
            ),
          )
          return
        }
        const modName =
          name.trim() ||
          t('playlistSettings.moderation.defaultModName', 'Модератор')
        await addModeratorByUserId(playlist.id, {
          target_user_id: targetUserId.trim(),
          name: modName,
          permissions,
          expires_at: expiresAt,
        })
        setName('')
        setTargetUserId('')
        toast.success(
          t(
            'playlistSettings.moderation.directAddedSuccess',
            'Модератор успешно добавлен по User ID!',
          ),
        )
      }
      loadModerators()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast.error(
        typeof detail === 'string'
          ? detail
          : t(
              'playlistSettings.moderation.createFailed',
              'Не удалось добавить модератора',
            ),
      )
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (moderatorId: string) => {
    if (!playlist?.id) return
    try {
      await revokeModerator(playlist.id, moderatorId)
      toast.success(
        t(
          'playlistSettings.moderation.revokedSuccess',
          'Доступ модератора отозван',
        ),
      )
      setModerators((prev) => prev.filter((m) => m.id !== moderatorId))
      if (latestCreatedToken) {
        const revoked = moderators.find((m) => m.id === moderatorId)
        if (revoked?.token === latestCreatedToken) {
          setLatestCreatedToken(null)
        }
      }
    } catch {
      toast.error(
        t(
          'playlistSettings.moderation.revokeFailed',
          'Не удалось отозвать доступ',
        ),
      )
    }
  }

  const openEditModal = (mod: ModeratorItemResponse) => {
    setEditingMod(mod)
    setEditName(mod.name)
    setEditPermissions(
      mod.permissions || {
        can_manage_queue: true,
        can_manage_playback: true,
        can_manage_settings: false,
      },
    )
    setEditIsActive(mod.is_active)
  }

  const handleSaveEdit = async () => {
    if (!playlist?.id || !editingMod) return
    try {
      setSavingEdit(true)
      const updated = await updateModerator(playlist.id, editingMod.id, {
        name: editName.trim() || editingMod.name,
        permissions: editPermissions,
        is_active: editIsActive,
      })
      toast.success(
        t(
          'playlistSettings.moderation.updatedSuccess',
          'Настройки модератора обновлены',
        ),
      )
      setModerators((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      )
      setEditingMod(null)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast.error(
        typeof detail === 'string'
          ? detail
          : t(
              'playlistSettings.moderation.updateFailed',
              'Не удалось обновить настройки модератора',
            ),
      )
    } finally {
      setSavingEdit(false)
    }
  }

  const getInviteUrl = (token: string) => {
    const origin = window.location.origin
    return `${origin}/playlists/${playlist?.id}?mod_token=${token}`
  }

  const handleCopy = (token: string, id: string) => {
    const url = getInviteUrl(token)
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success(
      t(
        'playlistSettings.moderation.copiedToast',
        'Ссылка скопирована в буфер обмена!',
      ),
    )
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6 text-text-main pb-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="size-5 text-accent" />
          {t('playlistSettings.moderation.title', 'Модераторы и доступ')}
        </h3>
        <p className="text-xs text-text-secondary mt-1">
          {t(
            'playlistSettings.moderation.subtitle',
            'Управление доступом и разрешениями операторов эфира и модераторов.',
          )}
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex gap-2 border-b border-accent/20 pb-2">
        <button
          type="button"
          onClick={() => setAddMode('token')}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            addMode === 'token'
              ? 'bg-accent text-text-main font-semibold'
              : 'bg-level-1 text-text-secondary hover:text-text-main'
          }`}
        >
          <LinkIcon className="size-3.5" />
          {t('playlistSettings.moderation.modeToken', 'Ссылка-приглашение')}
        </button>
        <button
          type="button"
          onClick={() => setAddMode('direct')}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            addMode === 'direct'
              ? 'bg-accent text-text-main font-semibold'
              : 'bg-level-1 text-text-secondary hover:text-text-main'
          }`}
        >
          <UserPlus className="size-3.5" />
          {t('playlistSettings.moderation.modeDirect', 'Напрямую по User ID')}
        </button>
      </div>

      {/* Form: Create New Moderator */}
      <form
        onSubmit={handleCreate}
        className="bg-level-2/60 border border-accent/40 rounded-lg p-4 space-y-4 shadow-sm"
      >
        <h4 className="text-sm font-medium flex items-center gap-2 text-text-main">
          {addMode === 'token' ? (
            <LinkIcon className="size-4 text-accent" />
          ) : (
            <UserPlus className="size-4 text-accent" />
          )}
          {addMode === 'token'
            ? t(
                'playlistSettings.moderation.createTitle',
                'Создать новую ссылку доступа',
              )
            : t(
                'playlistSettings.moderation.addDirectTitle',
                'Добавить модератора по User ID',
              )}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addMode === 'direct' && (
            <div>
              <Label className="text-xs text-text-secondary mb-1 block">
                {t(
                  'playlistSettings.moderation.userIdLabel',
                  'User ID пользователя',
                )}{' '}
                <span className="text-red-400">*</span>
              </Label>
              <Input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder={t(
                  'playlistSettings.moderation.userIdPlaceholder',
                  'UUID пользователя',
                )}
                className="bg-level-1 border-accent/50 text-xs text-text-main font-mono"
                required
              />
            </div>
          )}

          <div className={addMode === 'token' ? 'sm:col-span-2' : ''}>
            <Label className="text-xs text-text-secondary mb-1 block">
              {t(
                'playlistSettings.moderation.nameLabel',
                'Название модератора / заметка',
              )}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                addMode === 'token'
                  ? t(
                      'playlistSettings.moderation.namePlaceholder',
                      'Например: Оператор эфира 1',
                    )
                  : t(
                      'playlistSettings.moderation.directNamePlaceholder',
                      'Например: Иван (Модератор)',
                    )
              }
              className="bg-level-1 border-accent/50 text-xs text-text-main"
              maxLength={100}
            />
          </div>
        </div>

        {/* Permissions Switches */}
        <div>
          <Label className="text-xs text-text-secondary mb-2 block font-medium">
            {t(
              'playlistSettings.moderation.permissionsTitle',
              'Права и разрешения',
            )}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
              <div className="flex items-center gap-2">
                <ListMusic className="size-4 text-blue-400 shrink-0" />
                <span className="text-xs font-medium">
                  {t('playlistSettings.moderation.permQueue', 'Очередь')}
                </span>
              </div>
              <Switch
                checked={permissions.can_manage_queue}
                onCheckedChange={(val) =>
                  setPermissions((p) => ({ ...p, can_manage_queue: val }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
              <div className="flex items-center gap-2">
                <Play className="size-4 text-green-400 shrink-0" />
                <span className="text-xs font-medium">
                  {t('playlistSettings.moderation.permPlayback', 'Плеер')}
                </span>
              </div>
              <Switch
                checked={permissions.can_manage_playback}
                onCheckedChange={(val) =>
                  setPermissions((p) => ({ ...p, can_manage_playback: val }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
              <div className="flex items-center gap-2">
                <Settings className="size-4 text-amber-400 shrink-0" />
                <span className="text-xs font-medium">
                  {t('playlistSettings.moderation.permSettings', 'Настройки')}
                </span>
              </div>
              <Switch
                checked={permissions.can_manage_settings}
                onCheckedChange={(val) =>
                  setPermissions((p) => ({ ...p, can_manage_settings: val }))
                }
              />
            </div>
          </div>
        </div>

        {/* Expiration & Submit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-1">
          <div className="w-full sm:w-48">
            <Label className="text-xs text-text-secondary mb-1 block">
              {t(
                'playlistSettings.moderation.expirationLabel',
                'Срок действия',
              )}
            </Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger className="bg-level-1 border-accent/50 text-xs text-text-main">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-level-1 border-accent text-text-main">
                <SelectItem value="never">
                  {t('playlistSettings.moderation.exp.never', 'Бессрочно')}
                </SelectItem>
                <SelectItem value="24h">
                  {t('playlistSettings.moderation.exp.24h', '24 часа')}
                </SelectItem>
                <SelectItem value="7d">
                  {t('playlistSettings.moderation.exp.7d', '7 дней')}
                </SelectItem>
                <SelectItem value="30d">
                  {t('playlistSettings.moderation.exp.30d', '30 дней')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Btn
            type="submit"
            disabled={creating}
            className="bg-accent-muted text-text-main font-medium px-4 py-2 text-xs rounded-md shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4 mr-1.5" />
            {creating
              ? t('playlistSettings.moderation.creating', 'Создание...')
              : addMode === 'token'
                ? t('playlistSettings.moderation.createBtn', 'Создать ссылку')
                : t(
                    'playlistSettings.moderation.addDirectBtn',
                    'Добавить модератора',
                  )}
          </Btn>
        </div>
      </form>

      {/* Latest Created Link Banner */}
      {latestCreatedToken && (
        <div className="bg-accent/15 border border-accent rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
              <KeyRound className="size-4" />
              {t(
                'playlistSettings.moderation.newLinkReady',
                'Ссылка успешно создана!',
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={getInviteUrl(latestCreatedToken)}
              className="bg-level-1 border-accent/60 text-xs font-mono text-text-main"
            />
            <Btn
              type="button"
              onClick={() => handleCopy(latestCreatedToken, 'latest')}
              className="bg-accent text-text-main shrink-0 px-3 py-1.5 text-xs rounded-md"
            >
              {copiedId === 'latest' ? (
                <Check className="size-4 text-green-400 mr-1" />
              ) : (
                <Copy className="size-4 mr-1" />
              )}
              {copiedId === 'latest'
                ? tc('common.copied', 'Скопировано')
                : tc('common.copy', 'Копировать')}
            </Btn>
          </div>
        </div>
      )}

      {/* List of Existing Moderators */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-main">
          {t(
            'playlistSettings.moderation.activeLinksTitle',
            'Список модераторов плейлиста',
          )}
          <span className="text-xs text-text-secondary font-normal ml-2">
            ({moderators.length})
          </span>
        </h4>

        {loading ? (
          <p className="text-xs text-text-secondary italic">
            {tc('common.loading', 'Загрузка...')}
          </p>
        ) : moderators.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-accent/40 rounded-lg bg-level-2/30">
            <Shield className="size-8 text-text-secondary mx-auto mb-2 opacity-50" />
            <p className="text-xs text-text-secondary">
              {t(
                'playlistSettings.moderation.emptyList',
                'У вас пока нет активных модераторов или ссылок.',
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {moderators.map((mod) => {
              const isCopied = copiedId === mod.id
              return (
                <div
                  key={mod.id}
                  className={`bg-level-2/80 border ${
                    mod.is_active
                      ? 'border-accent/40 hover:border-accent/70'
                      : 'border-red-500/30 opacity-60'
                  } rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-text-main truncate max-w-[200px]">
                        {mod.name}
                      </span>
                      {mod.user_name ? (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1">
                          <UserCheck className="size-3" />
                          {t(
                            'playlistSettings.moderation.bound',
                            'Привязан: {{id}}',
                            { id: `${mod.user_name}` },
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                          <KeyRound className="size-3" />
                          {t(
                            'playlistSettings.moderation.pendingActivation',
                            'Ожидает активации',
                          )}
                        </span>
                      )}
                      {!mod.is_active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                          {t(
                            'playlistSettings.moderation.disabled',
                            'Отключен',
                          )}
                        </span>
                      )}
                    </div>

                    {/* Permissions Icons */}
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <span
                        className={`flex items-center gap-1 ${
                          mod.permissions?.can_manage_queue
                            ? 'text-blue-400 font-medium'
                            : 'opacity-40 line-through'
                        }`}
                      >
                        <ListMusic className="size-3" />
                        {t('playlistSettings.moderation.permQueue', 'Очередь')}
                      </span>
                      •
                      <span
                        className={`flex items-center gap-1 ${
                          mod.permissions?.can_manage_playback
                            ? 'text-green-400 font-medium'
                            : 'opacity-40 line-through'
                        }`}
                      >
                        <Play className="size-3" />
                        {t('playlistSettings.moderation.permPlayback', 'Плеер')}
                      </span>
                      •
                      <span
                        className={`flex items-center gap-1 ${
                          mod.permissions?.can_manage_settings
                            ? 'text-amber-400 font-medium'
                            : 'opacity-40 line-through'
                        }`}
                      >
                        <Settings className="size-3" />
                        {t(
                          'playlistSettings.moderation.permSettings',
                          'Настройки',
                        )}
                      </span>
                    </div>

                    {/* Expiration string */}
                    <p className="text-[10px] text-text-secondary">
                      {mod.expires_at
                        ? `${t('playlistSettings.moderation.expiresAt', 'Истекает')}: ${new Date(
                            mod.expires_at,
                          ).toLocaleString()}`
                        : t(
                            'playlistSettings.moderation.exp.never',
                            'Бессрочно',
                          )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Edit Settings Button */}
                    <Btn
                      type="button"
                      onClick={() => openEditModal(mod)}
                      className="bg-level-1 hover:bg-level-1/80 border border-accent/40 text-text-main p-1.5 text-xs rounded-md"
                      title={t(
                        'playlistSettings.moderation.editTitle',
                        'Настройки доступа',
                      )}
                    >
                      <Settings className="size-3.5 text-accent" />
                    </Btn>

                    {/* Copy Link button for unclaimed token */}
                    {!mod.user_id && mod.token && (
                      <Btn
                        type="button"
                        onClick={() => handleCopy(mod.token, mod.id)}
                        className="bg-level-1 hover:bg-level-1/80 border border-accent/40 text-text-main px-2.5 py-1 text-xs rounded-md"
                      >
                        {isCopied ? (
                          <Check className="size-3.5 text-green-400 mr-1" />
                        ) : (
                          <Copy className="size-3.5 mr-1" />
                        )}
                        {isCopied
                          ? tc('common.copied', 'Скопировано')
                          : tc('common.link', 'Ссылка')}
                      </Btn>
                    )}

                    <Btn
                      type="button"
                      onClick={() => handleRevoke(mod.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 text-xs rounded-md"
                      title={t(
                        'playlistSettings.moderation.revoke',
                        'Отозвать',
                      )}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      {t('playlistSettings.moderation.revoke', 'Отозвать')}
                    </Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Moderator Dialog */}
      {editingMod && (
        <Dialog
          open={Boolean(editingMod)}
          onOpenChange={(open) => !open && setEditingMod(null)}
        >
          <DialogContent className="bg-level-2 border border-accent text-text-main sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="size-5 text-accent" />
                {t(
                  'playlistSettings.moderation.editModalTitle',
                  'Настройки модератора',
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-text-secondary mb-1 block">
                  {t(
                    'playlistSettings.moderation.editNameLabel',
                    'Название / Заметка',
                  )}
                </Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-level-1 border-accent/50 text-xs text-text-main"
                  maxLength={100}
                />
              </div>

              <div>
                <Label className="text-xs text-text-secondary mb-2 block font-medium">
                  {t(
                    'playlistSettings.moderation.permissionsTitle',
                    'Права и разрешения',
                  )}
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
                    <div className="flex items-center gap-2">
                      <ListMusic className="size-4 text-blue-400" />
                      <span className="text-xs font-medium">
                        {t('playlistSettings.moderation.permQueue', 'Очередь')}
                      </span>
                    </div>
                    <Switch
                      checked={editPermissions.can_manage_queue}
                      onCheckedChange={(val) =>
                        setEditPermissions((p) => ({
                          ...p,
                          can_manage_queue: val,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
                    <div className="flex items-center gap-2">
                      <Play className="size-4 text-green-400" />
                      <span className="text-xs font-medium">
                        {t('playlistSettings.moderation.permPlayback', 'Плеер')}
                      </span>
                    </div>
                    <Switch
                      checked={editPermissions.can_manage_playback}
                      onCheckedChange={(val) =>
                        setEditPermissions((p) => ({
                          ...p,
                          can_manage_playback: val,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
                    <div className="flex items-center gap-2">
                      <Settings className="size-4 text-amber-400" />
                      <span className="text-xs font-medium">
                        {t(
                          'playlistSettings.moderation.permSettings',
                          'Настройки',
                        )}
                      </span>
                    </div>
                    <Switch
                      checked={editPermissions.can_manage_settings}
                      onCheckedChange={(val) =>
                        setEditPermissions((p) => ({
                          ...p,
                          can_manage_settings: val,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-level-1 rounded-md border border-accent/30">
                <span className="text-xs font-medium">
                  {t(
                    'playlistSettings.moderation.activeAccessLabel',
                    'Активен (Разрешить доступ)',
                  )}
                </span>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Btn
                type="button"
                onClick={() => setEditingMod(null)}
                className="bg-level-1 text-text-secondary hover:text-text-main text-xs px-3 py-1.5 rounded-md"
              >
                {t('playlistSettings.moderation.cancel', 'Отмена')}
              </Btn>
              <Btn
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="bg-accent-muted text-text-main text-xs px-4 py-1.5 rounded-md font-medium"
              >
                {savingEdit
                  ? t('playlistSettings.moderation.saving', 'Сохранение...')
                  : t('playlistSettings.moderation.save', 'Сохранить')}
              </Btn>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
