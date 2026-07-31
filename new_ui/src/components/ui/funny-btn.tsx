import { cn } from '@/lib/utils'
import type { RefObject } from 'react'

interface UpDownBtnProps {
  upOnClick?: () => void
  downOnClick?: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  getInputRef?: () => HTMLInputElement | null
  className?: string
}

const UpDownBtn = ({
  upOnClick,
  downOnClick,
  inputRef,
  getInputRef,
  className = '',
}: UpDownBtnProps) => {
  const containerStyle = cn(
    'flex flex-row items-center justify-center h-9 rounded-(--rounded-std)',
    className,
  )

  const handleAction = (type: 'up' | 'down') => {
    const inputElement = inputRef?.current ?? getInputRef?.() ?? null

    if (inputElement) {
      // 1. Делаем шаг через нативный API инпута
      if (type === 'up') inputElement.stepUp()
      else inputElement.stepDown()

      // 2. Уведомляем React State Manager через вызов нативного сеттера
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set

      nativeInputValueSetter?.call(inputElement, inputElement.value)

      // 3. Генерируем событие input, чтобы сработал onChange
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
    }

    if (type === 'up') upOnClick?.()
    else downOnClick?.()
  }

  return (
    <div className={containerStyle}>
      <button
        type="button" // ОБЯЗАТЕЛЬНО: предотвращает сабмит формы
        onClick={() => handleAction('up')}
        className="h-full w-full bg-level-2 pl-2 pr-2 hover:bg-level-3 active:bg-level-3/50 cursor-pointer flex items-center justify-center text-xs font-semibold select-none"
      >
        ↑
      </button>
      <button
        type="button" // ОБЯЗАТЕЛЬНО: предотвращает сабмит формы
        onClick={() => handleAction('down')}
        className="h-full w-full bg-level-2 pl-2 pr-2 hover:bg-level-3 active:bg-level-3/50 cursor-pointer flex items-center justify-center text-xs font-semibold select-none"
      >
        ↓
      </button>
    </div>
  )
}

export default UpDownBtn
