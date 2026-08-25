import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  Key,
  Link as LinkIcon,
  ListMusic,
  Radio,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  ChannelModeratorResponse,
  ModeratedChannelResponse,
  PlaylistAccessResponse,
} from '@/types/moderator'
import {
  addChannelModeratorByUserId,
  claimChannelModeratorToken,
  createChannelModeratorToken,
  fetchChannelModerators,
  fetchModeratedChannels,
  grantPlaylistAccess,
  revokeChannelModerator,
  revokePlaylistAccess,
  updateChannelModerator,
} from '@/api/api-moderators'
import { fetchMyPlaylists } from '@/api/api-playlist'
import type { ReadPlaylistPreview } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

interface PlaylistSelectionState {
  [playlistId: string]: {
    can_manage_tracks: boolean
    can_manage_settings: boolean
  }
}

export function ModeratorsTab() {
  const { t } = useFeatureTranslation()
  const [moderators, setModerators] = useState<ChannelModeratorResponse[]>([])
  const [moderatedChannels, setModeratedChannels] = useState<ModeratedChannelResponse[]>([])
  const [playlists, setPlaylists] = useState<ReadPlaylistPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modals state
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [isDirectAddOpen, setIsDirectAddOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [claimTokenInput, setClaimTokenInput] = useState('')

  const [tokenName, setTokenName] = useState(() =>
    t('settings.moderators.defaultTokenName', 'Модератор стрима'),
  )
  const [canControlPlayer, setCanControlPlayer] = useState(true)
  const [canManageAllPlaylists, setCanManageAllPlaylists] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Granular playlist selection during creation
  const [selectedPlaylists, setSelectedPlaylists] = useState<PlaylistSelectionState>({})

  // Playlist grant modal for existing moderators
  const [selectedMod, setSelectedMod] = useState<ChannelModeratorResponse | null>(null)
  const [grantPlaylistId, setGrantPlaylistId] = useState('')
  const [canManageTracks, setCanManageTracks] = useState(true)
  const [canManageSettings, setCanManageSettings] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [mods, channels, plsts] = await Promise.all([
        fetchChannelModerators().catch(() => []),
        fetchModeratedChannels().catch(() => []),
        fetchMyPlaylists().catch(() => []),
      ])
      setModerators(Array.isArray(mods) ? mods : [])
      setModeratedChannels(Array.isArray(channels) ? channels : [])
      setPlaylists(Array.isArray(plsts) ? (plsts as ReadPlaylistPreview[]) : [])
      usePlaybackStore.getState().setModeratedChannels(Array.isArray(channels) ? channels : [])
    } catch (err) {
      console.error(err)
      toast.error(
        t(
          'settings.moderators.errors.loadFailed',
          'Не удалось загрузить данные модерации',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()

    // Auto-detect token in URL
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('mod_token') || params.get('token')
    if (tokenFromUrl) {
      setClaimTokenInput(tokenFromUrl)
      setIsClaimModalOpen(true)
    }
  }, [])

  const resetModalForm = () => {
    setTokenName(t('settings.moderators.defaultTokenName', 'Модератор стрима'))
    setCanControlPlayer(true)
    setCanManageAllPlaylists(false)
    setTargetUserId('')
    setSelectedPlaylists({})
  }

  const togglePlaylistSelection = (plstId: string) => {
    setSelectedPlaylists((prev) => {
      if (prev[plstId]) {
        const copy = { ...prev }
        delete copy[plstId]
        return copy
      }
      return {
        ...prev,
        [plstId]: { can_manage_tracks: true, can_manage_settings: false },
      }
    })
  }

  const togglePlaylistPermission = (
    plstId: string,
    field: 'can_manage_tracks' | 'can_manage_settings',
  ) => {
    setSelectedPlaylists((prev) => {
      const current = prev[plstId] || { can_manage_tracks: true, can_manage_settings: false }
      return {
        ...prev,
        [plstId]: {
          ...current,
          [field]: !current[field],
        },
      }
    })
  }

  const applyPlaylistAccessGrants = async (modId: string): Promise<PlaylistAccessResponse[]> => {
    if (canManageAllPlaylists) return []
    const plstEntries = Object.entries(selectedPlaylists)
    if (plstEntries.length === 0) return []

    const grants = await Promise.all(
      plstEntries.map(([plstId, perms]) =>
        grantPlaylistAccess(modId, {
          playlist_id: plstId,
          can_manage_tracks: perms.can_manage_tracks,
          can_manage_settings: perms.can_manage_settings,
        }).catch((err) => {
          console.error(`Failed to grant access to playlist ${plstId}:`, err)
          return null
        }),
      ),
    )

    return grants.filter((g): g is PlaylistAccessResponse => g !== null)
  }

  const handleCreateToken = async () => {
    try {
      setIsSubmitting(true)
      const created = await createChannelModeratorToken({
        name:
          tokenName.trim() ||
          t('settings.moderators.defaultTokenName', 'Модератор стрима'),
        can_control_player: canControlPlayer,
        can_manage_all_playlists: canManageAllPlaylists,
      })

      let addedAccess: PlaylistAccessResponse[] = []
      if (!canManageAllPlaylists && Object.keys(selectedPlaylists).length > 0) {
        addedAccess = await applyPlaylistAccessGrants(created.id)
      }

      const fullCreated: ChannelModeratorResponse = {
        ...created,
        playlist_access: addedAccess.length > 0 ? addedAccess : created.playlist_access || [],
      }

      toast.success(
        t(
          'settings.moderators.success.tokenCreated',
          'Токен модератора успешно создан',
        ),
      )
      setModerators((prev) => [fullCreated, ...prev])
      setIsTokenModalOpen(false)
      resetModalForm()
    } catch (err: any) {
      console.error(err)
      toast.error(
        err.response?.data?.detail ||
          t(
            'settings.moderators.errors.tokenCreateFailed',
            'Ошибка создания токена',
          ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDirectAdd = async () => {
    if (!targetUserId.trim()) {
      toast.error(
        t('settings.moderators.errors.userIdRequired', 'Укажите ID пользователя'),
      )
      return
    }
    try {
      setIsSubmitting(true)
      const created = await addChannelModeratorByUserId({
        target_user_id: targetUserId.trim(),
        name:
          tokenName.trim() ||
          t('settings.moderators.defaultDirectAddName', 'Модератор'),
        can_control_player: canControlPlayer,
        can_manage_all_playlists: canManageAllPlaylists,
      })

      let addedAccess: PlaylistAccessResponse[] = []
      if (!canManageAllPlaylists && Object.keys(selectedPlaylists).length > 0) {
        addedAccess = await applyPlaylistAccessGrants(created.id)
      }

      const fullCreated: ChannelModeratorResponse = {
        ...created,
        playlist_access: addedAccess.length > 0 ? addedAccess : created.playlist_access || [],
      }

      toast.success(
        t(
          'settings.moderators.success.moderatorAdded',
          'Модератор успешно добавлен',
        ),
      )
      setModerators((prev) => [fullCreated, ...prev])
      setIsDirectAddOpen(false)
      resetModalForm()
    } catch (err: any) {
      console.error(err)
      toast.error(
        err.response?.data?.detail ||
          t(
            'settings.moderators.errors.moderatorAddFailed',
            'Ошибка добавления модератора',
          ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClaimToken = async () => {
    if (!claimTokenInput.trim()) {
      toast.error(
        t(
          'settings.moderators.errors.tokenRequired',
          'Введите токен модератора',
        ),
      )
      return
    }
    try {
      setIsSubmitting(true)
      let cleanToken = claimTokenInput.trim()
      if (cleanToken.includes('token=')) {
        const match = cleanToken.match(/token=([a-zA-Z0-9_-]+)/)
        if (match) cleanToken = match[1]
      }
      await claimChannelModeratorToken(cleanToken)
      toast.success(
        t(
          'settings.moderators.success.tokenClaimed',
          'Токен успешно активирован! Вы подключены как модератор.',
        ),
      )
      setIsClaimModalOpen(false)
      setClaimTokenInput('')
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(
        err.response?.data?.detail ||
          t(
            'settings.moderators.errors.tokenClaimFailed',
            'Не удалось активировать токен',
          ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (modId: string) => {
    try {
      await revokeChannelModerator(modId)
      toast.success(
        t('settings.moderators.success.moderatorRevoked', 'Модератор отозван'),
      )
      setModerators((prev) => prev.filter((m) => m.id !== modId))
      if (selectedMod?.id === modId) setSelectedMod(null)
    } catch {
      toast.error(
        t(
          'settings.moderators.errors.moderatorRevokeFailed',
          'Ошибка отзыва модератора',
        ),
      )
    }
  }

  const handleTogglePlayerControl = async (mod: ChannelModeratorResponse, val: boolean) => {
    try {
      const updated = await updateChannelModerator(mod.id, { can_control_player: val })
      setModerators((prev) =>
        prev.map((m) =>
          m.id === mod.id ? { ...m, can_control_player: updated.can_control_player } : m,
        ),
      )
      toast.success(
        t(
          'settings.moderators.success.playerRightsUpdated',
          'Права на плеер обновлены',
        ),
      )
    } catch {
      toast.error(
        t(
          'settings.moderators.errors.rightsUpdateFailed',
          'Ошибка обновления прав',
        ),
      )
    }
  }

  const handleToggleAllPlaylists = async (mod: ChannelModeratorResponse, val: boolean) => {
    try {
      const updated = await updateChannelModerator(mod.id, { can_manage_all_playlists: val })
      setModerators((prev) =>
        prev.map((m) =>
          m.id === mod.id ? { ...m, can_manage_all_playlists: updated.can_manage_all_playlists } : m,
        ),
      )
      toast.success(
        t(
          'settings.moderators.success.playlistRightsUpdated',
          'Права на плейлисты обновлены',
        ),
      )
    } catch {
      toast.error(
        t(
          'settings.moderators.errors.rightsUpdateFailed',
          'Ошибка обновления прав',
        ),
      )
    }
  }

  const handleGrantPlaylist = async () => {
    if (!selectedMod || !grantPlaylistId) return
    try {
      const res = await grantPlaylistAccess(selectedMod.id, {
        playlist_id: grantPlaylistId,
        can_manage_tracks: canManageTracks,
        can_manage_settings: canManageSettings,
      })
      toast.success(
        t(
          'settings.moderators.success.playlistAccessGranted',
          'Доступ к плейлисту предоставлен',
        ),
      )
      setModerators((prev) =>
        prev.map((m) => {
          if (m.id !== selectedMod.id) return m
          const filtered = (m.playlist_access || []).filter(
            (pa) => pa.playlist_id !== grantPlaylistId,
          )
          return { ...m, playlist_access: [...filtered, res] }
        }),
      )
      setGrantPlaylistId('')
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail ||
          t(
            'settings.moderators.errors.playlistAccessGrantFailed',
            'Ошибка предоставления доступа',
          ),
      )
    }
  }

  const handleRevokePlaylist = async (modId: string, plstId: string) => {
    try {
      await revokePlaylistAccess(modId, plstId)
      toast.success(
        t(
          'settings.moderators.success.playlistAccessRevoked',
          'Доступ к плейлисту отозван',
        ),
      )
      setModerators((prev) =>
        prev.map((m) => {
          if (m.id !== modId) return m
          return {
            ...m,
            playlist_access: (m.playlist_access || []).filter(
              (pa) => pa.playlist_id !== plstId,
            ),
          }
        }),
      )
    } catch {
      toast.error(
        t(
          'settings.moderators.errors.playlistAccessRevokeFailed',
          'Ошибка отзыва доступа к плейлисту',
        ),
      )
    }
  }

  const copyToClipboard = (text: string, isLink = false) => {
    const value = isLink
      ? `${window.location.origin}/settings#tab-moderators?mod_token=${text}`
      : text
    navigator.clipboard.writeText(value)
    setCopiedToken(text)
    toast.success(
      isLink
        ? t(
            'settings.moderators.success.linkCopied',
            'Ссылка-приглашение скопирована',
          )
        : t('settings.moderators.success.tokenCopied', 'Токен скопирован'),
    )
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-level-2 border border-accent/30 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Shield className="size-5 text-accent" />
            {t('settings.moderators.title', 'Модерация канала (V2)')}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {t(
              'settings.moderators.subtitle',
              'Управляйте модераторами вашего канала или активируйте полученный токен приглашения.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            onClick={() => setIsClaimModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <ShieldCheck className="size-3.5 text-emerald-400" />
            {t('settings.moderators.claimTokenBtn', 'Активировать токен')}
          </Btn>
          <Btn
            onClick={() => {
              resetModalForm()
              setIsTokenModalOpen(true)
            }}
            className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Key className="size-3.5 text-accent" />
            {t('settings.moderators.createTokenBtn', 'Создать ссылку-токен')}
          </Btn>
          <Btn
            onClick={() => {
              resetModalForm()
              setIsDirectAddOpen(true)
            }}
            className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <UserPlus className="size-3.5" />
            {t('settings.moderators.addByIdBtn', 'Добавить по ID')}
          </Btn>
        </div>
      </div>

      {/* Channels I Moderate Section */}
      {moderatedChannels.length > 0 && (
        <div className="p-4 rounded-xl bg-level-2/60 border border-accent/20 space-y-3">
          <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
            <Radio className="size-4 text-accent" />
            {t(
              'settings.moderators.moderatedChannelsTitle',
              'Каналы, на которых вы модератор:',
            )}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {moderatedChannels.map((c) => (
              <div
                key={c.moderator_id}
                className="p-3 rounded-lg bg-level-1 border border-accent/15 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-text-main text-xs block truncate">
                    {t('settings.moderators.channelOwner', 'Канал: {{name}}', {
                      name: c.owner_name,
                    })}
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    {c.can_control_player &&
                      t('settings.moderators.playerPerm', '🎛️ Плеер ')}
                    {c.can_manage_all_playlists
                      ? t('settings.moderators.allPlaylistsPerm', '• Все плейлисты')
                      : t(
                          'settings.moderators.playlistsCountPerm',
                          '• Плейлистов: {{count}}',
                          { count: c.playlist_access?.length || 0 },
                        )}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold uppercase shrink-0">
                  {t('settings.moderators.statusActive', 'Активен')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Channel Moderators List */}
      <div>
        <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
          <UserCheck className="size-4 text-accent" />
          {t('settings.moderators.myModeratorsTitle', 'Модераторы моего канала:')}
        </h3>

        {loading ? (
          <div className="p-8 text-center text-text-secondary text-sm">
            {t('settings.moderators.loading', 'Загрузка модераторов...')}
          </div>
        ) : moderators.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-level-1 border border-dashed border-accent/40">
            <Shield className="size-8 text-text-secondary mx-auto mb-2 opacity-50" />
            <p className="text-sm text-text-secondary">
              {t(
                'settings.moderators.noModerators',
                'У вас пока нет назначенных модераторов на канале.',
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {moderators.map((mod) => (
              <div
                key={mod.id}
                className="p-4 rounded-xl bg-level-1 border border-accent/20 space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-accent/10 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-main text-sm">{mod.name}</span>
                      {mod.user_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-level-2 border border-accent/20 text-accent font-medium">
                          @{mod.user_name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          mod.user_id
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {mod.user_id
                          ? t('settings.moderators.statusBound', 'Привязан')
                          : t(
                              'settings.moderators.statusPending',
                              'Ожидает активации',
                            )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-mono text-text-secondary truncate max-w-[180px]">
                        {mod.token}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(mod.token, false)}
                        className="text-text-secondary hover:text-text-main flex items-center gap-1 text-[11px]"
                        title={t(
                          'settings.moderators.copyTokenTitle',
                          'Скопировать токен',
                        )}
                      >
                        {copiedToken === mod.token ? (
                          <Check className="size-3 text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {t('settings.moderators.tokenBtn', 'Токен')}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(mod.token, true)}
                        className="text-accent hover:underline flex items-center gap-1 text-[11px]"
                        title={t(
                          'settings.moderators.copyLinkTitle',
                          'Скопировать готовую ссылку-приглашение',
                        )}
                      >
                        <LinkIcon className="size-3" />
                        {t(
                          'settings.moderators.copyLinkBtn',
                          'Скопировать ссылку',
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Btn
                      onClick={() =>
                        setSelectedMod(selectedMod?.id === mod.id ? null : mod)
                      }
                      className="px-2.5 py-1 text-xs"
                    >
                      {selectedMod?.id === mod.id
                        ? t('settings.moderators.hidePlaylists', 'Скрыть плейлисты')
                        : t('settings.moderators.showPlaylists', 'Плейлисты')}
                    </Btn>
                    <button
                      type="button"
                      onClick={() => handleRevoke(mod.id)}
                      className="p-1.5 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title={t(
                        'settings.moderators.revokeModTitle',
                        'Отозвать модератора',
                      )}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* General Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-level-2/60 border border-accent/10">
                    <span className="text-text-secondary font-medium">
                      {t(
                        'settings.moderators.playerAndWidgetControl',
                        'Управление плеером и виджетом',
                      )}
                    </span>
                    <Switch
                      checked={mod.can_control_player}
                      onCheckedChange={(val) => handleTogglePlayerControl(mod, val)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-level-2/60 border border-accent/10">
                    <span className="text-text-secondary font-medium">
                      {t(
                        'settings.moderators.accessAllPlaylists',
                        'Доступ ко ВСЕМ плейлистам',
                      )}
                    </span>
                    <Switch
                      checked={mod.can_manage_all_playlists}
                      onCheckedChange={(val) => handleToggleAllPlaylists(mod, val)}
                    />
                  </div>
                </div>

                {/* Granular Playlists Section */}
                {selectedMod?.id === mod.id && !mod.can_manage_all_playlists && (
                  <div className="pt-2 border-t border-accent/10 space-y-3">
                    <h4 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                      <LinkIcon className="size-3.5 text-accent" />
                      {t(
                        'settings.moderators.specificPlaylistsAccess',
                        'Доступ к отдельным плейлистам',
                      )}
                    </h4>

                    {/* Add playlist grant row */}
                    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-level-2 border border-accent/20">
                      <select
                        value={grantPlaylistId}
                        onChange={(e) => setGrantPlaylistId(e.target.value)}
                        className="bg-level-1 border border-accent/30 rounded px-2.5 py-1 text-xs text-text-main flex-1 min-w-[160px]"
                      >
                        <option value="">
                          {t(
                            'settings.moderators.selectPlaylistPlaceholder',
                            'Выберите плейлист...',
                          )}
                        </option>
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canManageTracks}
                          onChange={(e) => setCanManageTracks(e.target.checked)}
                          className="rounded accent-accent"
                        />
                        {t('settings.moderators.permTracks', 'Треки')}
                      </label>

                      <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canManageSettings}
                          onChange={(e) => setCanManageSettings(e.target.checked)}
                          className="rounded accent-accent"
                        />
                        {t('settings.moderators.permSettings', 'Настройки')}
                      </label>

                      <Btn
                        onClick={handleGrantPlaylist}
                        className="px-2.5 py-1 text-xs font-semibold"
                      >
                        {t('settings.moderators.grantAccessBtn', 'Выдать доступ')}
                      </Btn>
                    </div>

                    {/* Granted list */}
                    {!mod.playlist_access || mod.playlist_access.length === 0 ? (
                      <p className="text-xs text-text-secondary italic">
                        {t(
                          'settings.moderators.noPlaylistAccessGranted',
                          'Нет выданных прав на плейлисты.',
                        )}
                      </p>
                    ) : (
                      <div className="grid gap-1.5">
                        {mod.playlist_access.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between p-2 rounded bg-level-2/40 border border-accent/10 text-xs"
                          >
                            <span className="font-medium text-text-main">
                              {acc.playlist_name || acc.playlist_id}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-text-secondary">
                                {acc.can_manage_tracks &&
                                  t('settings.moderators.badgeTracks', '🎵 Треки ')}
                                {acc.can_manage_settings &&
                                  t('settings.moderators.badgeSettings', '⚙️ Настройки')}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRevokePlaylist(mod.id, acc.playlist_id)
                                }
                                className="text-rose-400 hover:text-rose-300"
                                title={t(
                                  'settings.moderators.revokePlaylistAccessTitle',
                                  'Удалить доступ',
                                )}
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Claim Token */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-level-1 border border-accent/40 rounded-xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-text-main flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              {t(
                'settings.moderators.claimModal.title',
                'Активировать токен модератора',
              )}
            </h3>
            <p className="text-xs text-text-secondary">
              {t(
                'settings.moderators.claimModal.subtitle',
                'Вставьте строку токена или полученную ссылку-приглашение для подключения к каналу стримера.',
              )}
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">
                  {t(
                    'settings.moderators.claimModal.inputLabel',
                    'Токен или ссылка',
                  )}
                </Label>
                <Input
                  value={claimTokenInput}
                  onChange={(e) => setClaimTokenInput(e.target.value)}
                  placeholder={t(
                    'settings.moderators.claimModal.inputPlaceholder',
                    'Вставьте токен или ссылку...',
                  )}
                  className="mt-1"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-accent/20">
              <Btn
                onClick={() => {
                  setIsClaimModalOpen(false)
                  setClaimTokenInput('')
                }}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs"
              >
                {t('settings.moderators.cancelBtn', 'Отмена')}
              </Btn>
              <Btn
                onClick={handleClaimToken}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-semibold"
              >
                {isSubmitting
                  ? t('settings.moderators.claimModal.claiming', 'Активация...')
                  : t('settings.moderators.claimModal.claimBtn', 'Активировать')}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Token */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-level-1 border border-accent/40 rounded-xl p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-bold text-text-main flex items-center gap-2">
              <Key className="size-4 text-accent" />
              {t(
                'settings.moderators.createModal.title',
                'Создать ссылку-токен модератора',
              )}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">
                  {t(
                    'settings.moderators.createModal.nameLabel',
                    'Название / Описание',
                  )}
                </Label>
                <Input
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder={t(
                    'settings.moderators.createModal.namePlaceholder',
                    'Например: Модератор чата',
                  )}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-level-2 border border-accent/20">
                <span className="font-medium">
                  {t(
                    'settings.moderators.playerAndWidgetControl',
                    'Управление плеером и виджетом',
                  )}
                </span>
                <Switch
                  checked={canControlPlayer}
                  onCheckedChange={setCanControlPlayer}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-level-2 border border-accent/20">
                <span className="font-medium">
                  {t(
                    'settings.moderators.accessAllPlaylists',
                    'Доступ ко всем плейлистам',
                  )}
                </span>
                <Switch
                  checked={canManageAllPlaylists}
                  onCheckedChange={setCanManageAllPlaylists}
                />
              </div>

              {/* Granular Playlist Selector */}
              {!canManageAllPlaylists && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                      <ListMusic className="size-3.5 text-accent" />
                      {t(
                        'settings.moderators.createModal.selectPlaylistsLabel',
                        'Выберите плейлисты для доступа:',
                      )}
                    </Label>
                    <span className="text-[10px] text-text-secondary">
                      {t(
                        'settings.moderators.createModal.selectedCount',
                        'Выбрано: {{count}}',
                        { count: Object.keys(selectedPlaylists).length },
                      )}
                    </span>
                  </div>

                  {playlists.length === 0 ? (
                    <div className="p-3 rounded-lg bg-level-2/60 text-center text-text-secondary text-xs">
                      {t(
                        'settings.moderators.createModal.noPlaylists',
                        'У вас пока нет созданных плейлистов',
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {playlists.map((pl) => {
                        const isSelected = !!selectedPlaylists[pl.id]
                        const currentPerms = selectedPlaylists[pl.id] || {
                          can_manage_tracks: true,
                          can_manage_settings: false,
                        }
                        return (
                          <div
                            key={pl.id}
                            className={`p-2 rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-level-2 border-accent/40'
                                : 'bg-level-2/40 border-accent/10 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePlaylistSelection(pl.id)}
                                  className="rounded accent-accent size-3.5"
                                />
                                <span className="font-medium text-text-main truncate">
                                  {pl.name}
                                </span>
                              </label>

                              {isSelected && (
                                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                                  <label className="flex items-center gap-1 text-text-secondary cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentPerms.can_manage_tracks}
                                      onChange={() =>
                                        togglePlaylistPermission(pl.id, 'can_manage_tracks')
                                      }
                                      className="rounded accent-accent"
                                    />
                                    {t('settings.moderators.permTracks', 'Треки')}
                                  </label>
                                  <label className="flex items-center gap-1 text-text-secondary cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentPerms.can_manage_settings}
                                      onChange={() =>
                                        togglePlaylistPermission(
                                          pl.id,
                                          'can_manage_settings',
                                        )
                                      }
                                      className="rounded accent-accent"
                                    />
                                    {t(
                                      'settings.moderators.permSettings',
                                      'Настройки',
                                    )}
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-accent/20">
              <Btn
                onClick={() => setIsTokenModalOpen(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs"
              >
                {t('settings.moderators.cancelBtn', 'Отмена')}
              </Btn>
              <Btn
                onClick={handleCreateToken}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-semibold"
              >
                {isSubmitting
                  ? t('settings.moderators.createModal.creating', 'Создание...')
                  : t('settings.moderators.createModal.createBtn', 'Создать')}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Direct Add */}
      {isDirectAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-level-1 border border-accent/40 rounded-xl p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-bold text-text-main flex items-center gap-2">
              <UserPlus className="size-4 text-accent" />
              {t(
                'settings.moderators.directAddModal.title',
                'Добавить модератора по ID',
              )}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">
                  {t(
                    'settings.moderators.directAddModal.userIdLabel',
                    'User ID (UUID)',
                  )}
                </Label>
                <Input
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder={t(
                    'settings.moderators.directAddModal.userIdPlaceholder',
                    'например, 123e4567-e89b-12d3-a456-426614174000',
                  )}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  {t(
                    'settings.moderators.directAddModal.nameLabel',
                    'Имя / Заметка',
                  )}
                </Label>
                <Input
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder={t(
                    'settings.moderators.directAddModal.namePlaceholder',
                    'Модератор',
                  )}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-level-2 border border-accent/20">
                <span className="font-medium">
                  {t(
                    'settings.moderators.playerAndWidgetControl',
                    'Управление плеером и виджетом',
                  )}
                </span>
                <Switch
                  checked={canControlPlayer}
                  onCheckedChange={setCanControlPlayer}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-level-2 border border-accent/20">
                <span className="font-medium">
                  {t(
                    'settings.moderators.accessAllPlaylists',
                    'Доступ ко всем плейлистам',
                  )}
                </span>
                <Switch
                  checked={canManageAllPlaylists}
                  onCheckedChange={setCanManageAllPlaylists}
                />
              </div>

              {/* Granular Playlist Selector */}
              {!canManageAllPlaylists && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                      <ListMusic className="size-3.5 text-accent" />
                      {t(
                        'settings.moderators.createModal.selectPlaylistsLabel',
                        'Выберите плейлисты для доступа:',
                      )}
                    </Label>
                    <span className="text-[10px] text-text-secondary">
                      {t(
                        'settings.moderators.createModal.selectedCount',
                        'Выбрано: {{count}}',
                        { count: Object.keys(selectedPlaylists).length },
                      )}
                    </span>
                  </div>

                  {playlists.length === 0 ? (
                    <div className="p-3 rounded-lg bg-level-2/60 text-center text-text-secondary text-xs">
                      {t(
                        'settings.moderators.createModal.noPlaylists',
                        'У вас пока нет созданных плейлистов',
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {playlists.map((pl) => {
                        const isSelected = !!selectedPlaylists[pl.id]
                        const currentPerms = selectedPlaylists[pl.id] || {
                          can_manage_tracks: true,
                          can_manage_settings: false,
                        }
                        return (
                          <div
                            key={pl.id}
                            className={`p-2 rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-level-2 border-accent/40'
                                : 'bg-level-2/40 border-accent/10 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePlaylistSelection(pl.id)}
                                  className="rounded accent-accent size-3.5"
                                />
                                <span className="font-medium text-text-main truncate">
                                  {pl.name}
                                </span>
                              </label>

                              {isSelected && (
                                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                                  <label className="flex items-center gap-1 text-text-secondary cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentPerms.can_manage_tracks}
                                      onChange={() =>
                                        togglePlaylistPermission(pl.id, 'can_manage_tracks')
                                      }
                                      className="rounded accent-accent"
                                    />
                                    {t('settings.moderators.permTracks', 'Треки')}
                                  </label>
                                  <label className="flex items-center gap-1 text-text-secondary cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentPerms.can_manage_settings}
                                      onChange={() =>
                                        togglePlaylistPermission(
                                          pl.id,
                                          'can_manage_settings',
                                        )
                                      }
                                      className="rounded accent-accent"
                                    />
                                    {t(
                                      'settings.moderators.permSettings',
                                      'Настройки',
                                    )}
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-accent/20">
              <Btn
                onClick={() => setIsDirectAddOpen(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs"
              >
                {t('settings.moderators.cancelBtn', 'Отмена')}
              </Btn>
              <Btn
                onClick={handleDirectAdd}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-semibold"
              >
                {isSubmitting
                  ? t('settings.moderators.directAddModal.adding', 'Добавление...')
                  : t('settings.moderators.directAddModal.addBtn', 'Добавить')}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

