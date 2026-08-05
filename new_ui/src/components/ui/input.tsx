import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  `flex w-full min-w-0 rounded-md text-xs sm:text-sm text-text-main 
  placeholder:text-text-placeholder transition-all outline-none 
  disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50
  file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium`,
  {
    variants: {
      variant: {
        default:
          'bg-level-2 border-0 h-8 px-2.5 focus-visible:ring-1 focus-visible:ring-accent/50',
        outline:
          'bg-level-1 border border-accent-muted h-8 px-2.5 focus-visible:ring-1 focus-visible:ring-accent/50',
        mono:
          'bg-level-1 border border-accent-muted font-mono text-xs h-8 px-3 py-1.5 focus-visible:ring-1 focus-visible:ring-accent/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {}

function Input({ className, type, variant, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
