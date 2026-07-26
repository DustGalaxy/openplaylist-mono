import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReadChatRules, Role } from '@/types/playlist'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'

interface ChatRoleItemProps {
  role: ReadChatRules
  availableRoles: Array<Role>
  onUpdate: (role: ReadChatRules) => void
  onDelete: () => void
}

const ChatRoleItem = ({
  role,
  availableRoles,
  onUpdate,
  onDelete,
}: ChatRoleItemProps) => {
  const priorityInputRef = React.useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id })

  const handlePriorityChange = (val: string) => {
    const num = parseInt(val)
    if (isNaN(num) || num < 0) return
    onUpdate({ ...role, priority: num })
  }

  const roleData = availableRoles.find((r) => r.key === role.key)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border border-level-3 rounded-lg bg-level-1 transition-opacity cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
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
          {roleData?.name || role.key}
        </span>
      </div>

      <div
        className="flex rounded-[--rounded-std] items-center gap-0 overflow-hidden flex-shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Input
          type="number"
          dir="rtl"
          ref={priorityInputRef}
          value={role.priority || 0}
          className="border-0 bg-level-2 text-text-main focus-visible:ring-0 rounded-r-none px-1 text-xs w-10 h-7 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(e) => handlePriorityChange(e.target.value)}
        />
        <UpDownBtn
          getInputRef={() => priorityInputRef.current}
          className="h-7 rounded-r-(--rounded-std) rounded-l-none overflow-clip"
        />
      </div>

      <button
        onClick={onDelete}
        className="px-2 h-6 text-xs text-text-main/70 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()}
      >
        ✕
      </button>
    </div>
  )
}

export default React.memo(ChatRoleItem)
