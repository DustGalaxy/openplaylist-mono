import List from '@/components/icons/icon-list'

export default function Counter({ number }: { number: number }) {
  return (
    <div className="
    w-max bg-level-2 
    mt-1 flex items-center gap-2 
    rounded-[var(--rounded-std)] 
    px-2 
    ">
      <List className="size-3.5" />
      <span className=" text-base text-text-secondary mb-0.5 tabular-nums">
        {number}{' '}
        {number === 1
          ? 'трек'
          : number >= 2 && number <= 4
            ? 'трека'
            : 'треков'}
      </span>
    </div>
  )
}
