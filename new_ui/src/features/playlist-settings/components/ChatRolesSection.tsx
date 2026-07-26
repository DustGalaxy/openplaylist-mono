// src/features/playlist-settings/components/playlist-settings/ChatRolesSection.tsx
import React from 'react'
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
import default_roles from '@/lib/constants/roles'
import { orderedChatRoles } from '@/api/settings/chat-roles'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'

export default function ChatRolesSection({
  platform,
}: {
  platform: ChatPlatform
}) {
  const { t } = useTranslation()
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
    // optimistic: splice reordered platform rules back into the full chat_rules list, preserving other platforms' entries
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
      <div>
        <Label className="text-lg">
          {t('playlistSettings.chatRoles.title')}
        </Label>
        <DialogDescription>
          {t('playlistSettings.chatRoles.subtitle')}
        </DialogDescription>
      </div>

      {unusedRoles.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-level-2 border-level-3 h-8 text-xs">
                <SelectValue
                  placeholder={t('playlistSettings.chatRoles.addRole')}
                />
              </SelectTrigger>
              <SelectContent className="bg-level-2 border-level-3">
                {unusedRoles.map((role) => (
                  <SelectItem
                    key={role.key}
                    value={role.key}
                    className="bg-level-2 focus:bg-level-3 text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-text-main">
                      {role.badge_type === 'img' &&
                        typeof role.badge_url === 'string' && (
                          <img
                            src={role.badge_url}
                            alt={role.name}
                            className="w-4 h-4"
                          />
                        )}
                      {role.badge_type === 'svg' && role.badge_url && (
                        <div className="w-4 h-4 flex items-center justify-center">
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
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              dir="rtl"
              ref={priorityInputRef}
              value={priority}
              placeholder="0"
              className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1 text-xs w-12 h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(e) => {
                const num = parseInt(e.target.value)
                if (isNaN(num) || num < 0) return
                setPriority(num)
              }}
            />
            <UpDownBtn
              getInputRef={() => priorityInputRef.current}
              className="h-8 rounded-r-(--rounded-std) rounded-l-none overflow-clip"
            />
          </div>
          <Btn
            onClick={handleAddRole}
            disabled={!selectedRole || isCreating}
            className="px-3 h-8 text-xs bg-level-2 border border-level-3"
          >
            {t('playlistSettings.chatRoles.add')}
          </Btn>
        </div>
      )}

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
            <div className="space-y-3">
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
        <div>
          <Label>{t('playlistSettings.chatRoles.noRoles')}</Label>
          <DialogDescription>
            {t('playlistSettings.chatRoles.addRoleHint')}
          </DialogDescription>
        </div>
      )}
    </div>
  )
}
