import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Btn({
  text,
  onClick,
  className,
  disabled = false,
  ...props
}: {
  text: string | React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  props?: React.ButtonHTMLAttributes<HTMLButtonElement>
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        `
        pt-0.5 pb-[3px]            
        sm:pt-1 sm:pb-[5px] 
        cursor-pointer 
        transition-all 
        duration-100 
        ease-out
        rounded-[var(--rounded-std)] 
        flex items-center justify-center 
        box-border
        
        shadow-[0_3px_0_0_theme(colors.level-3),_0_0px_10px_rgba(0,0,0,0.4),_0_2px_4px_rgba(0,0,0,0.3)]
        sm:shadow-[0_5px_0_0_theme(colors.level-3),_0_0px_15px_rgba(0,0,0,0.55),_0_4px_8px_rgba(0,0,0,0.45)]
        
        hover:shadow-[0_6px_0_0_theme(colors.level-3),0_0px_15px_rgba(255,255,255,0.25),0_4px_8px_rgba(255,255,255,0.15)]
        hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),_0_0_25px_rgba(255,255,255,0.4)]
        hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
        disabled:hover:shadow-none
        disabled:hover:text-shadow-none
        disabled:[&_svg]:drop-shadow-none
        disabled:active:shadow-none
        disabled:active:translate-y-0
        transform translate-y-0
        active:translate-y-[3px]
        sm:active:translate-y-[5px]   
        active:shadow-[0_0px_0_0_theme(colors.level-3),0_0px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)] 
        
      `,
        className,
      )}
      {...props}
    >
      {text}
    </button>
  )
}
