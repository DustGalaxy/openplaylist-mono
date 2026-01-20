import React from 'react'
import DateOutline from '../icons/icon-date' // Предполагается, что это SVG-компонент

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip' // Импорты из Shadcn UI

export default function DateChip({ date }: { date: string }) {
  const formattedDate = new Date(date).toLocaleDateString('en-UK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const fullDate = new Date(date).toLocaleDateString('en-UK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  return (
    <div
      className="
        bg-level-2
        rounded-[var(--rounded-std)]              
        border-r-[5px] border-t-[5px] border-level-3
        h-[28px] sm:h-[32px] md:h-[40px]         
        px-1.5 sm:px-2 md:px-3           
        shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)]         
        sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)]
        inline-flex items-center justify-center   
      "
    >
      <div
        className="
          text-center flex
          text-[14px] sm:text-[16px] md:text-[18px] 
          gap-1 sm:gap-1.5 md:gap-2               
          items-center h-full
        "
      >
        {/* Адаптивный размер SVG-иконки */}
        <DateOutline
          width={'16px'}
          height={'16px'}
          className="sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]"
        />
        <Tooltip>
          <TooltipTrigger>
            {/* Адаптивный размер текста внутри TooltipTrigger */}
            <span
              className="
                text-white pb-1
                text-[12px] sm:text-[16px] md:text-[18px] /* Дублируем размер текста для Span, если он может переопределиться */
              "
            >
              {' '}
              {formattedDate}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{fullDate}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
