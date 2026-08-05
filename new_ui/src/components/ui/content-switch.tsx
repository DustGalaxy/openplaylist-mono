import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ContentSwitchProps {
  leftLabel: React.ReactNode
  rightLabel: React.ReactNode
  onChange?: (side: 'left' | 'right') => void
  defaultValue?: 'left' | 'right'
  width?: string
  height?: string
  className?: string // Для внешних стилей (например, маргинов)
}

function ContentSwitch({
  leftLabel,
  rightLabel,
  onChange,
  defaultValue = 'left',
  className,
  width = '140px',
  height = '33px',
}: ContentSwitchProps) {
  const [isRight, setIsRight] = useState(defaultValue === 'right')

  const toggle = () => {
    const newState = !isRight
    setIsRight(newState)
    if (onChange) onChange(newState ? 'right' : 'left')
  }

  return (
    <div
      onClick={toggle}
      style={{ width, height }}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-2xl border-2 border-accent/40 bg-level-2 p-1.5 transition-colors duration-300',
        className,
      )}
    >
      {/* Текст 1 (Справа) */}
      <div
        className={cn(
          'absolute right-5 font-medium text-text-main transition-all duration-300 ease-out',
          isRight
            ? 'pointer-events-none scale-95 opacity-0'
            : 'scale-100 opacity-100',
        )}
      >
        {leftLabel}
      </div>
      {/* Текст 2 (Слева) */}
      <div
        className={cn(
          'absolute left-5 font-medium text-text-main transition-all duration-300 ease-out',
          isRight
            ? 'scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        {rightLabel}
      </div>
      {/* Перемещающийся кружок */}
      <div
        style={{
          // Сдвиг на всю ширину контейнера за вычетом ширины самого кружка (которая равна высоте из-за aspect-square)
          transform: isRight
            ? `translateX(calc(${width} - ${height} + 3px))`
            : 'translateX(0px)',
        }}
        className="h-full aspect-square rounded-xl bg-accent shadow-md transition-transform duration-300 ease-in-out"
      />
    </div>
  )
}

export default ContentSwitch
