import { cn } from '@/lib/utils'

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean // Если true — кнопка визуально зафиксирована в нажатом состоянии
}

export default function Btn({
  onClick,
  className,
  disabled = false,
  isActive,
  children,
  ...props
}: BtnProps) {
  const isToggleMode = isActive !== undefined

  const button3DHeightPx = 3
  const sm_button3DHeightPx = 3

  // 1. Передача динамических значений в CSS-переменные
  const dynamicStyles = {
    '--h-3d': `${button3DHeightPx}px`,
    '--h-3d-sm': `${sm_button3DHeightPx}px`,
  } as React.CSSProperties

  // 2. Определение классов с использованием CSS-переменных
  const transformClasses = isToggleMode
    ? isActive
      ? 'transform translate-y-0'
      : 'transform -translate-y-[var(--h-3d)] sm:-translate-y-[var(--h-3d-sm)]'
    : 'transform -translate-y-[var(--h-3d)] sm:-translate-y-[var(--h-3d-sm)] active:translate-y-0'

  const shadowClasses = isToggleMode
    ? isActive
      ? 'shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]'
      : 'shadow-[0_var(--h-3d)_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] sm:shadow-[0_var(--h-3d-sm)_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]'
    : `
        shadow-[0_var(--h-3d)_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] 
        sm:shadow-[0_var(--h-3d-sm)_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]
        active:shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]
      `

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={dynamicStyles}
      className={cn(
        `
        pt-0.5 pb-0.75            
        sm:pt-1 sm:pb-1.25 
        cursor-pointer 
        transition-all 
        text-text-main
        [&_svg]:text-text-main
        duration-100 
        ease-out
        rounded-(--rounded-std) 
        flex items-center justify-center 
        box-border
        ring-1 ring-level-3/40
        border-level-2 bg-level-2
        
        hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),0_0_25px_rgba(255,255,255,0.4)]
        hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]

        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
        disabled:hover:shadow-none
        disabled:hover:text-shadow-none
        disabled:[&_svg]:drop-shadow-none
        disabled:active:shadow-none
        disabled:translate-y-0
      `,
        transformClasses,
        shadowClasses,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
