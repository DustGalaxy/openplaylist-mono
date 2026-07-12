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

  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
        
        /* ХОВЕР (работает всегда, кроме отключенного состояния) */
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
        // 1. ЛОГИКА ТРАНСФОРМАЦИИ СДВИГА
        isToggleMode
          ? isActive
            ? 'transform translate-y-0 '
            : '-translate-y-0.75 sm:-translate-y-1.25'
          : 'transform -translate-y-0.75 sm:-translate-y-1.25 active:translate-y-0',

        // 2. ЛОГИКА ТЕНЕЙ И ЦВЕТНОГО ТОРЦА
        isToggleMode
          ? isActive
            ? 'shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]'
            : 'shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]'
          : `
            shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] 
            sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]
            active:shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]
          `,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
