import React from 'react'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import TwitchPriority from './twitchPriority'
import type { ClientPlaylist, PlaylistSettings } from '@/types/playlist'

const ChatRoles = ({
  playlist,
  setSettings,
  settings,
  canRequest,
}: {
  playlist: ClientPlaylist
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
  settings: PlaylistSettings
  canRequest: React.RefObject<boolean>
}) => {
  const [costMode, setCostMode] = React.useState(playlist.settings.cost_mode)

  const [costDonater, setCostDonater] = React.useState(
    playlist.settings.cost_donater,
  )

  return (
    <div className="gap-1 flex flex-col">
      <Label className=" text-xl">Priority</Label>
      <DialogDescription>
        Set priority score for types of users. Can be negative.
      </DialogDescription>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Label className=" text-lg">Cost mode</Label>
        <RadioGroup
          defaultValue={costMode}
          className="flex gap-0 justify-end"
          onValueChange={(e) => {
            if (e === 'add') {
              setCostMode('add')
              setSettings({ ...settings, cost_mode: 'add' })
              canRequest.current = true
            } else if (e === 'max') {
              setCostMode('max')
              setSettings({ ...settings, cost_mode: 'max' })
              canRequest.current = true
            }
          }}
        >
          <div
            className={`flex items-center  cursor-pointer  bg-level-2
          py-1 pl-4 pr-[2px] rounded-l-(--rounded-std)  justify-end`}
          >
            <RadioGroupItem
              value="add"
              id="cost-add-id"
              className={`sr-only `}
            />
            <Label
              htmlFor="cost-add-id"
              className={`${costMode === 'add' ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
            flex cursor-pointer transition-all duration-100 text-lg`}
            >
              ADD
            </Label>
          </div>
          <div
            className={`flex items-center  cursor-pointer bg-level-2
          py-1 pr-4 pl-[2px] rounded-r-(--rounded-std) justify-start`}
          >
            <RadioGroupItem value="max" id="cost-max-id" className="sr-only" />
            <Label
              htmlFor="cost-max-id"
              className={`${costMode === 'max' ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
            cursor-pointer transition-all duration-100 text-lg`}
            >
              MAX
            </Label>
          </div>
        </RadioGroup>
      </div>

      <DialogDescription>
        <p>Max - set max role score to the track.</p>
        <p>Add - accomulate score by all user roles.</p>
      </DialogDescription>

      {/* <div className="h-[1px] bg-level-3" /> */}

      {/* Cost settings */}
      <Accordion type="multiple">
        <AccordionItem value="twitch-costs">
          <AccordionTrigger>
            <Label className=" text-xl">Twitch</Label>
          </AccordionTrigger>
          <AccordionContent>
            <TwitchPriority
              playlist={playlist}
              setSettings={setSettings}
              settings={settings}
              canRequest={canRequest}
            />
          </AccordionContent>
        </AccordionItem>

        <div className="h-[1px] bg-level-3" />
        <AccordionItem value="donations-costs">
          <AccordionTrigger>
            <Label className=" text-xl">Donations</Label>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex justify-between gap-2 items-center">
              <div className="flex gap-2 items-center">
                <svg
                  width="18px"
                  height="18px"
                  viewBox="0 0 24.00 24.00"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-labelledby="dolarIconTitle"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  color="#fff"
                >
                  <g id="SVGRepo_iconCarrier">
                    <path d="M12 4L12 6M12 18L12 20M15.5 8C15.1666667 6.66666667 14 6 12 6 9 6 8.5 7.95652174 8.5 9 8.5 13.140327 15.5 10.9649412 15.5 15 15.5 16.0434783 15 18 12 18 10 18 8.83333333 17.3333333 8.5 16"></path>{' '}
                  </g>
                </svg>
                <Label className=" text-lg">Donater</Label>
              </div>

              <Input
                type="number"
                value={costDonater}
                onChange={(e) => {
                  if (isNaN(parseInt(e.target.value))) return
                  setCostDonater(parseInt(e.target.value))
                  setSettings({
                    ...settings,
                    cost_donater: parseInt(e.target.value),
                  })
                  canRequest.current = true
                }}
                className="border-level-3 border-1 w-20"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default ChatRoles
