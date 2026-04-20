import { useState } from 'react'
import { Input } from './ui/input'
import Btn from './ui/my-btn'
import Search from './icons/icon-search'

export default function SearchBar({
  value,
  setValue,
  action,
  placeholder = 'Search',
}: {
  value: string
  setValue: (value: string) => void
  action: () => void
  placeholder?: string
}) {
  const [visibility, setVisibility] = useState(false)
  return (
    <div className="flex gap-2 items-center">
      <Btn
        text={<Search />}
        className="w-[50px]"
        onClick={() => {
          setVisibility(!visibility)
          if (visibility && value) action()
        }}
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full ${visibility ? 'w-full opacity-100' : 'opacity-0 w-0'} border-[2px] border-level-3 rounded-(--rounded-std) bg-level-2 text-text-main 
        transition-all duration-500 ease-in-out`}
      />
    </div>
  )
}
