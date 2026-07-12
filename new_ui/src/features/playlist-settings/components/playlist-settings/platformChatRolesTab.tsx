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
import type { ChatPlatform, ReadChatRules } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import MyBtn from '@/components/ui/my-btn'
import { TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import UpDownBtn from '@/components/ui/funny-btn'
import default_roles from '@/lib/constants/roles'
import { createChatRole, orderedChatRoles } from '@/api/settings/chat-roles'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'

interface PlatformChatRolesTabProps {
  platform: ChatPlatform
  platformKey: string
  rules: Array<ReadChatRules> | undefined
  playlist_id: string
  settings_id: string
  onRoleCreated: (role: ReadChatRules) => void
  onRoleUpdated: (role: ReadChatRules) => void
  onRoleDeleted: (role_id: string) => void
}

const PlatformChatRolesTab = React.memo(
  ({
    platform,
    platformKey,
    rules,
    playlist_id,
    settings_id,
    onRoleCreated,
    onRoleUpdated,
    onRoleDeleted,
  }: PlatformChatRolesTabProps) => {
    const { t } = useTranslation()
    const [selectedRole, setSelectedRole] = React.useState<string>('')
    const [priority, setPriority] = React.useState<number>(0)
    const [isCreating, setIsCreating] = React.useState(false)
    const [sortedRules, setSortedRules] = React.useState<Array<ReadChatRules>>()
    const priorityInputRef = React.useRef<HTMLInputElement>(null)

    // Set up drag sensors
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    )

    // Sync sorted rules with props
    React.useEffect(() => {
      if (rules) {
        setSortedRules(rules)
      }
    }, [rules])

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id && sortedRules) {
        const oldIndex = sortedRules.findIndex((r) => r.id === active.id)
        const newIndex = sortedRules.findIndex((r) => r.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(sortedRules, oldIndex, newIndex)
          setSortedRules(newOrder)
        }
      }
    }

    const availableRoles = default_roles[platform]

    // Get roles not yet added
    const unusedRoles = availableRoles.filter(
      (ar) => !rules?.some((r) => r.key === ar.key),
    )

    useDebouncedEffect(
      sortedRules,
      () => {
        if (sortedRules) {
          orderedChatRoles(
            sortedRules.map((r) => r.id),
            playlist_id,
          )
        }
      },
      3000,
    )

    const handleAddRole = React.useCallback(async () => {
      if (!selectedRole) {
        toast.error(t('playlistSettings.chatRoles.selectRole'))
        return
      }

      setIsCreating(true)
      try {
        const response = await createChatRole({
          playlist_id,
          data: {
            platform: platform,
            settings_id: settings_id,
            key: selectedRole,
            priority: priority,
          },
        })

        if (response) {
          onRoleCreated(response)
          setSelectedRole('')
          setPriority(0)
          toast.success(t('playlistSettings.chatRoles.addSuccess'))
        } else {
          toast.error(t('playlistSettings.chatRoles.addFailed'))
        }
      } catch (error) {
        console.error('Error creating role:', error)
        toast.error(t('playlistSettings.chatRoles.addFailed'))
      } finally {
        setIsCreating(false)
      }
    }, [selectedRole, playlist_id, settings_id, platform, onRoleCreated])

    return (
      <TabsContent value={platform} className="space-y-6">
        <div>
          <Label className="text-xl">{platformKey} Roles</Label>
          <DialogDescription>
            Configure role priorities for {platformKey}
          </DialogDescription>
        </div>

        {/* Add role form - inline and compact */}
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
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1 text-xs w-12 h-8
                  [appearance:textfield] 
                  [&::-webkit-inner-spin-button]:m-0 
                  [&::-webkit-inner-spin-button]:appearance-none 
                  [&::-webkit-outer-spin-button]:m-0 
                  [&::-webkit-outer-spin-button]:appearance-none"
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

            <MyBtn
              onClick={handleAddRole}
              disabled={!selectedRole || isCreating}
              className="px-3 h-8 text-xs bg-level-2 border border-level-3"
            >
              {t('playlistSettings.chatRoles.add')}
            </MyBtn>
          </div>
        )}

        {/* Existing roles list */}
        <div className="space-y-4">
          {sortedRules && sortedRules.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedRules.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedRules.map((role) => (
                    <ChatRoleItem
                      key={role.id}
                      role={role}
                      availableRoles={availableRoles}
                      playlist_id={playlist_id}
                      onUpdate={onRoleUpdated}
                      onDelete={onRoleDeleted}
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
      </TabsContent>
    )
  },
)
PlatformChatRolesTab.displayName = 'PlatformChatRolesTab'

export default PlatformChatRolesTab
