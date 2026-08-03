// src/features/playlist-settings/components/playlist-settings/ChatRolesSection.tsx
import React from 'react'
import { Plus, ShieldCheck, UserCheck, Users, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import ChatRoleItem from './chatRoleItem'
import type { DragEndEvent } from '@dnd-kit/core'
import type { ChatPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'
import Btn from '@/components/ui/my-btn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import default_roles from '@/lib/constants/roles'
import { orderedChatRoles } from '@/api/settings/chat-roles'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function ChatRolesSection({
  platform,
}: {
  platform: ChatPlatform
}) {
  const { t } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { addChatRole, updateChatRole, removeChatRole, updatePlaylistData } =
    usePlaylistStore()

  const [selectedRole, setSelectedRole] = React.useState('')
  const [priority, setPriority] = React.useState(0)
  const [isCreating, setIsCreating] = React.useState(false)
  const priorityInputRef = React.useRef<HTMLInputElement>(null)
  const reorderTimerRef = React.useRef<ReturnType<typeof setTimeout>>()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const rules = playlist.chat_rules.filter((r) => r.platform === platform)
  const availableRoles = default_roles[platform]
  const unusedRoles = availableRoles.filter(
    (ar) => !rules.some((r) => r.key === ar.key),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rules.findIndex((r) => r.id === active.id)
    const newIndex = rules.findIndex((r) => r.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(rules, oldIndex, newIndex)
    updatePlaylistData(playlist.id, (p) => ({
      ...p,
      chat_rules: [
        ...p.chat_rules.filter((r) => r.platform !== platform),
        ...reordered,
      ],
    }))

    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current)
    reorderTimerRef.current = setTimeout(() => {
      orderedChatRoles(
        reordered.map((r) => r.id),
        playlist.id,
      ).catch(() => {})
    }, 1500)
  }

  const handleAddRole = async () => {
    if (!selectedRole) {
      toast.error(t('playlistSettings.chatRoles.selectRole'))
      return
    }
    setIsCreating(true)
    try {
      const role = await addChatRole(playlist.id, {
        platform,
        key: selectedRole,
        priority,
      })
      if (role) {
        setSelectedRole('')
        setPriority(0)
        toast.success(t('playlistSettings.chatRoles.addSuccess'))
      } else {
        toast.error(t('playlistSettings.chatRoles.addFailed'))
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    const success = await removeChatRole(playlist.id, roleId)
    if (success) toast.success(t('playlistSettings.chatRoles.removeSuccess'))
    else toast.error(t('playlistSettings.chatRoles.removeFailed'))
  }

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-level-3/40 text-level-3 mt-0.5">
          <UserCheck className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('playlistSettings.chatRoles.title')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t('playlistSettings.chatRoles.subtitle')}
          </DialogDescription>
        </div>
      </div>

      {/* Creation Card */}
      {unusedRoles.length > 0 && (
        <div className="p-2.5 sm:p-3 border border-level-3/60 rounded-md bg-level-1 space-y-2.5 shadow-xs">
          <div className="text-xs font-semibold text-text-main flex items-center gap-1.5">
            <Plus className="size-3.5 text-level-3" />
            <span>
              {t(
                'playlistSettings.chatRoles.addRoleTitle',
                'Add role priority',
              )}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Select Role Dropdown */}
            <div className="flex-1 min-w-0">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-level-2 border-0 h-8 text-xs sm:text-sm">
                  <SelectValue
                    placeholder={t('playlistSettings.chatRoles.addRole')}
                  />
                </SelectTrigger>
                <SelectContent className="bg-level-2 border-level-3/40">
                  {unusedRoles.map((role) => (
                    <SelectItem
                      key={role.key}
                      value={role.key}
                      className="bg-level-2 focus:bg-level-3 text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-text-main">
                        {role.badge_type === 'img' &&
                          typeof role.badge_url === 'string' && (
                            <img
                              src={role.badge_url}
                              alt={role.name}
                              className="w-4 h-4 object-contain"
                            />
                          )}
                        {role.badge_type === 'svg' && role.badge_url && (
                          <div className="w-4 h-4 flex items-center justify-center text-level-3">
                            {role.badge_url}
                          </div>
                        )}
                        <span>{role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Input + Add Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Priority Input */}
              <div className="flex flex-col gap-0.5 w-20 sm:w-24">
                <div className="flex items-center gap-1 sm:hidden">
                  <Zap className="size-3 text-text-secondary" />
                  <Label className="text-[10px] text-text-secondary">
                    {t(
                      'playlistSettings.chatRoles.priorityHeader',
                      'Priority (+)',
                    )}
                  </Label>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-8">
                      <Input
                        type="number"
                        dir="rtl"
                        ref={priorityInputRef}
                        value={priority}
                        placeholder="0"
                        className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                        onChange={(e) => {
                          const num = parseInt(e.target.value)
                          if (isNaN(num) || num < 0) return
                          setPriority(num)
                        }}
                      />
                      <UpDownBtn
                        getInputRef={() => priorityInputRef.current}
                        className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-8"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-level-2 text-text-main border-level-3/40 border text-xs"
                  >
                    <p>
                      {t(
                        'playlistSettings.chatRoles.hints.priority',
                        'Priority points added to queue for viewers with this role',
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Add Button */}
              <Btn
                onClick={handleAddRole}
                disabled={!selectedRole || isCreating}
                className="h-8 px-3 bg-level-2 text-xs font-semibold text-text-main shrink-0 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                <span>{t('playlistSettings.chatRoles.add', 'Add')}</span>
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {rules.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rules.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 pt-1">
              <div className="hidden sm:flex items-center gap-2 px-2 text-[11px] font-semibold text-text-secondary">
                <div className="flex-1">
                  {t('playlistSettings.chatRoles.role', 'Role')}
                </div>
                <div className="w-24 text-right">
                  {t(
                    'playlistSettings.chatRoles.priorityHeader',
                    'Priority (+)',
                  )}
                </div>
                <div className="w-8"></div>
              </div>
              {rules.map((role) => (
                <ChatRoleItem
                  key={role.id}
                  role={role}
                  availableRoles={availableRoles}
                  onUpdate={(updated) => updateChatRole(playlist.id, updated)}
                  onDelete={() => handleDelete(role.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="p-4 border border-dashed border-level-3/60 rounded-md bg-level-1/50 text-center">
          <p className="text-xs font-semibold text-text-main">
            {t('playlistSettings.chatRoles.noRoles')}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {t('playlistSettings.chatRoles.addRoleHint')}
          </p>
        </div>
      )}
    </div>
  )
}
