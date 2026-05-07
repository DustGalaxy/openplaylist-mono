import Priority from '@/components/icons/icon-priority' // Предполагается, что это SVG-компонент

export default function PriorityChip({ number }: { number: number }) {
  return (
    <div
      className="
        bg-level-2
        rounded-[var(--rounded-std)]            
        border-r-[5px] border-t-[5px] border-level-3
        
       
        h-[28px] sm:h-[32px] md:h-[40px]         
        shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)]         
        sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)]

        px-1.5 sm:px-2 md:px-3                    
        
        inline-flex items-center justify-center   
      "
    >
      <div
        className="
          text-center flex
          
          
          text-[20px] sm:text-[22px] md:text-[26px] 
          
       
          gap-1 sm:gap-1.5 md:gap-2               
          
          items-center h-full
        "
      >
        {/* Адаптивный размер SVG-иконки */}
        <Priority
          width={'16px'}
          height={'16px'}
          className="sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]"
        />
        {number}
      </div>
    </div>
  )
}
