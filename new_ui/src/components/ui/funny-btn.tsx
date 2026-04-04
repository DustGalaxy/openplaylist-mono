import React from 'react'
import { cn } from '@/lib/utils'

const UpDownBtn = ({
  upOnClick = () => console.log('Up'),
  downOnClick = () => console.log('Down'),
  className = '',
  inputRef,
}: {
  upOnClick?: () => void
  downOnClick?: () => void
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}) => {
  const containerStyle = cn(
    '  rounded-(--rounded-std) flex flex-row items-center justify-center h-9',
    className,
  )

  const handleAction = (type: 'up' | 'down') => {
    if (inputRef?.current) {
      // Используем нативные методы для type="number"

      if (type === 'up') inputRef.current.stepUp()
      else inputRef.current.stepDown()

      // Генерируем событие 'input', чтобы React увидел изменение значения
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
    }

    // Вызываем коллбеки, если они переданы
    if (type === 'up') upOnClick?.()
    else downOnClick?.()
  }

  return (
    <div className={containerStyle}>
      <button
        onClick={() => handleAction('up')}
        className="pl-2 pr-2 h-full w-full bg-level-2 hover:bg-level-3 active:bg-level-3/50"
      >
        ↑
      </button>
      <button
        onClick={() => handleAction('down')}
        className="pr-2 pl-2 h-full w-full bg-level-2 hover:bg-level-3 active:bg-level-3/50"
      >
        ↓
      </button>
    </div>
  )
}

export default UpDownBtn
