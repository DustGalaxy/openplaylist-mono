import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean // Если true — кнопка зафиксирована в нажатом состоянии
}

export function Button({
  onClick,
  className,
  disabled = false,
  isActive,
  children,
  ...props
}: ButtonProps) {
  const isToggleMode = isActive !== undefined
  const isActiveState = isToggleMode && isActive

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        `
        btn-3d
        pt-0.5 pb-0.75 sm:pt-1 sm:pb-1.25 
        px-3 py-1.5
        cursor-pointer 
        transition-all 
        text-text-main
        [&_svg]:text-text-main
        duration-100 
        ease-out
        rounded-(--rounded-std) 
        flex items-center justify-center gap-2
        box-border
        border border-accent/40
        bg-level-2
        text-sm font-medium
        
        hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),0_0_25px_rgba(255,255,255,0.4)]
        hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]

        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
        disabled:hover:shadow-none
        disabled:hover:text-shadow-none
        disabled:[&_svg]:drop-shadow-none
      `,
        isActiveState && 'btn-3d-active',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
