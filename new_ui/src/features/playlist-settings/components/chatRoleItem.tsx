import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Zap } from 'lucide-react'
import type { ReadChatRules, Role } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import UpDownBtn from '@/components/ui/funny-btn'
import { Input } from '@/components/ui/input'
import Btn from '@/components/ui/my-btn'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

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
  const { t } = useFeatureTranslation()
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
      className="border border-level-3/60 rounded-md p-2 sm:p-2.5 bg-level-1 hover:border-level-3/80 transition-all flex items-center justify-between gap-2.5 shadow-xs cursor-grab active:cursor-grabbing group"
      {...attributes}
      {...listeners}
    >
      {/* Left Handle & Role Info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <GripVertical className="size-4 text-text-placeholder group-hover:text-text-secondary transition-colors shrink-0" />
        {roleData && (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-level-2 border border-level-3/40">
            {roleData.badge_type === 'img' &&
              typeof roleData.badge_url === 'string' && (
                <img
                  src={roleData.badge_url}
                  alt={roleData.name}
                  className="w-4 h-4 object-contain"
                />
              )}
            {roleData.badge_type === 'svg' && roleData.badge_url && (
              <div className="w-4 h-4 flex items-center justify-center text-level-3">
                {roleData.badge_url}
              </div>
            )}
          </div>
        )}
        <span className="text-xs sm:text-sm font-semibold text-text-main truncate">
          {roleData?.name || role.key}
        </span>
      </div>

      {/* Right Controls: Priority & Delete */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Priority Input + Tooltip */}
        <div className="flex flex-col gap-0.5 w-20 sm:w-24">
          <div className="flex items-center gap-1 sm:hidden">
            <Zap className="size-3 text-text-secondary" />
            <Label className="text-[10px] text-text-secondary">
              {t('playlistSettings.chatRoles.priorityHeader', 'Priority (+)')}
            </Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-8">
                <Input
                  type="number"
                  dir="rtl"
                  ref={priorityInputRef}
                  value={role.priority || 0}
                  placeholder="0"
                  className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) => handlePriorityChange(e.target.value)}
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

        {/* Delete Button with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Btn
              onClick={onDelete}
              type="button"
              aria-label={t(
                'playlistSettings.chatRoles.hints.delete',
                'Delete role',
              )}
              className="p-1.5 text-text-placeholder hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-sm h-8 w-8 flex items-center justify-center shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="size-4" />
            </Btn>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-level-2 text-text-main border-level-3/40 border text-xs"
          >
            <p>
              {t(
                'playlistSettings.chatRoles.hints.delete',
                'Delete role priority',
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export default React.memo(ChatRoleItem)
