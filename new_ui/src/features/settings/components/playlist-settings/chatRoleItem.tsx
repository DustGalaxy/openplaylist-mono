import React from 'react'
import { toast } from 'sonner'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import MyBtn from '@/components/ui/my-btn'
import UpDownBtn from '@/components/ui/funny-btn'
import type { ReadChatRules, Role } from '@/types/playlist'
import { deleteChatRole, updateChatRole } from '@/api/settings/chat-roles'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'

interface ChatRoleItemProps {
  role: ReadChatRules
  availableRoles: Array<Role>
  playlist_id: string
  onUpdate?: (role: ReadChatRules) => void
  onDelete?: (role_id: string) => void
}

const ChatRoleItem = ({
  role,
  availableRoles,
  playlist_id,
  onUpdate,
  onDelete,
}: ChatRoleItemProps) => {
  const [localRole, setLocalRole] = React.useState(role)
  const [isDirty, setIsDirty] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const priorityInputRef = React.useRef<HTMLInputElement>(null)

  // Drag-and-drop setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id })

  // Sync local state with prop when role changes
  React.useEffect(() => {
    setLocalRole(role)
    setIsDirty(false)
  }, [role])

  // Debounced save
  useDebouncedEffect(
    localRole,
    () => {
      if (!isSaving && isDirty && localRole.id === role.id) {
        setIsSaving(true)
        updateChatRole({
          playlist_id,
          data: localRole,
        })
          .then(() => {
            setIsDirty(false)
            onUpdate?.(localRole)
          })
          .catch((error) => {
            console.error(`Error saving chat role ${localRole.id}:`, error)
            setLocalRole(role)
          })
          .finally(() => {
            setIsSaving(false)
          })
      }
    },
    2000,
  )

  const handlePriorityChange = (val: string) => {
    const num = parseInt(val)
    if (isNaN(num) || num < 0) return
    setLocalRole((prev) => ({
      ...prev,
      priority: num,
    }))
    setIsDirty(true)
  }

  const handleDelete = async () => {
    const success = await deleteChatRole({
      playlist_id,
      role_id: role.id,
    })
    if (success) {
      toast.success('Role removed')
      onDelete?.(role.id)
    } else {
      toast.error('Failed to remove role')
    }
  }

  const roleData = availableRoles.find((r) => r.key === localRole.key)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isSaving ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border border-level-3 rounded-lg bg-level-1 transition-opacity cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Role badge and name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {roleData && (
          <>
            {roleData.badge_type === 'img' &&
              typeof roleData.badge_url === 'string' && (
                <img
                  src={roleData.badge_url}
                  alt={roleData.name}
                  className="w-5 h-5 flex-shrink-0"
                />
              )}
            {roleData.badge_type === 'svg' && roleData.badge_url && (
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {roleData.badge_url}
              </div>
            )}
          </>
        )}
        <span className="text-sm text-text-main font-medium truncate">
          {roleData?.name || localRole.key}
        </span>
      </div>

      {/* Priority input */}
      <div
        className="flex rounded-[--rounded-std] items-center gap-0 overflow-hidden flex-shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Input
          type="number"
          dir="rtl"
          ref={priorityInputRef}
          value={localRole.priority || 0}
          className="border-0 bg-level-2 text-text-main focus-visible:ring-0 rounded-r-none px-1 text-xs w-10 h-7
            [appearance:textfield] 
            [&::-webkit-inner-spin-button]:m-0 
            [&::-webkit-inner-spin-button]:appearance-none 
            [&::-webkit-outer-spin-button]:m-0 
            [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(e) => handlePriorityChange(e.target.value)}
        />
        <UpDownBtn
          getInputRef={() => priorityInputRef.current}
          className="h-7 rounded-r-(--rounded-std) rounded-l-none overflow-clip"
        />
      </div>

      {/* Delete button */}
      <button
        onClick={() => {
          handleDelete()
        }}
        className="px-2 h-6 text-xs 
                text-text-main/70 cursor-pointer opacity-80 hover:opacity-100 transition-opacity
               "
        onPointerDown={(e) => e.stopPropagation()}
      >
        ✕
      </button>
    </div>
  )
}

export default React.memo(ChatRoleItem)
