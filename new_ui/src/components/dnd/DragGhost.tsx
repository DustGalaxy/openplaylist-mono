import { GripVertical } from "lucide-react";

export function MiniCardDragGhost({ title, duration }: { title: string; duration: string }) {
  return (
    <div className="w-full h-23 rounded-(--rounded-std) border-2 border-level-3 bg-level-2 shadow-[0_12px_28px_rgba(0,0,0,0.5)] flex items-center px-3 gap-2 rotate-1">

      <span className="text-sm font-semibold text-text-main truncate">{title}</span>
      <span className="ml-auto text-xs font-mono text-text-placeholder shrink-0">{duration}</span>
      <GripVertical className="h-4 w-4 text-level-3 shrink-0" />
    </div>
  )
}