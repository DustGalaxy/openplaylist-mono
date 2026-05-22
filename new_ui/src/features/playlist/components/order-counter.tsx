import List from '@/components/icons/icon-list'

export default function Counter({ number }: { number: number }) {
  return (
    <div className="w-max bg-level-2 mt-1 flex items-center gap-2 rounded-[var(--rounded-std)] px-2 border-2 border-level-3 text-2xl">
      <List /> {number}
    </div>
  )
}
