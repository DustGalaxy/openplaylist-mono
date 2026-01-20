import { useState } from 'react'
import { Input } from './ui/input'
import Btn from './ui/my-btn'
import Add from './icons/icon-add'

export default function AddBar() {
  const [visibility, setVisibility] = useState(false)
  return (
    <div className=" flex gap-2 items-center">
      <Btn
        text={<Add />}
        className="w-[50px]"
        onClick={() => setVisibility(!visibility)}
      />
      <Input
        type="text"
        placeholder="Place url here"
        className={`w-full ${visibility ? 'w-full opacity-100' : 'opacity-0 w-0'} border-[2px] border-level-3 rounded-(--rounded-std) bg-level-2 text-white 
        transition-all duration-500 ease-in-out`}
      />
    </div>
  )
}
