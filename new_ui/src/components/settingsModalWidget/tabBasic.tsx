import React from 'react'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { DialogDescription } from '../ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import type { ClientPlaylist, PlaylistSettings } from '@/types/playlist'

const TabBasic = ({
  playlist,
  setSettings,
  canRequest,
  settings,
}: {
  playlist: ClientPlaylist
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
  canRequest: React.RefObject<boolean>
  settings: PlaylistSettings
}) => {
  const [plstMode, setPlstMode] = React.useState(playlist.settings.mode)
  const [privacy, setPrivacy] = React.useState(playlist.is_public)
  return (
    <div>
      <div className="grid gap-4">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Label className=" text-lg">Playlist mode</Label>
          <RadioGroup
            defaultValue={plstMode}
            className="flex gap-0 justify-end"
            onValueChange={(e) => {
              if (e === 'flow') {
                setPlstMode('flow')
                setSettings({ ...settings, mode: 'flow' })
                canRequest.current = true
              } else if (e === 'static') {
                setPlstMode('static')
                setSettings({ ...settings, mode: 'static' })
                canRequest.current = true
              }
            }}
          >
            <div
              className={`flex items-center  cursor-pointer  bg-level-2
            py-1 pl-4 pr-[2px] rounded-l-(--rounded-std)  justify-end`}
            >
              <RadioGroupItem
                value="flow"
                id="flow-id"
                className={`sr-only `}
              />
              <Label
                htmlFor="flow-id"
                className={`${plstMode === 'flow' ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
            flex cursor-pointer transition-all duration-100 text-lg`}
              >
                FLOW
              </Label>
            </div>

            <div
              className={`flex items-center  cursor-pointer bg-level-2
            py-1 pr-4 pl-[2px] rounded-r-(--rounded-std) justify-start`}
            >
              <RadioGroupItem
                value="static"
                id="static-id"
                className="sr-only"
              />
              <Label
                htmlFor="static-id"
                className={`${plstMode === 'static' ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
            cursor-pointer transition-all duration-100 text-lg`}
              >
                STATIC
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <DialogDescription>
        <div className="py-1">
          Flow - remove track after playing or skip to next track.
        </div>
        <div className="py-1">Static - normal playlist.</div>
      </DialogDescription>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Label className=" text-lg">Privacy</Label>

        <RadioGroup
          defaultValue={privacy ? 'public' : 'private'}
          className="flex gap-0 justify-end"
          onValueChange={(e) => {
            if (e === 'public') {
              setPrivacy(true)
              setSettings({ ...settings, is_public: true })
              canRequest.current = true
            } else if (e === 'private') {
              setPrivacy(false)
              setSettings({ ...settings, is_public: false })
              canRequest.current = true
            }
          }}
        >
          <div
            className={`flex items-center  cursor-pointer  bg-level-2
          py-1 pl-4 pr-[2px] rounded-l-(--rounded-std)  justify-end`}
          >
            <RadioGroupItem
              value="public"
              id="public-id"
              className={`sr-only `}
            />
            <Label
              htmlFor="public-id"
              className={`${privacy ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
            flex cursor-pointer transition-all duration-100 text-lg`}
            >
              PUBLIC
            </Label>
          </div>
          <div
            className={`flex items-center  cursor-pointer bg-level-2
          py-1 pr-4 pl-[2px] rounded-r-(--rounded-std) justify-start`}
          >
            <RadioGroupItem
              value="private"
              id="private-id"
              className="sr-only"
            />
            <Label
              htmlFor="private-id"
              className={`${!privacy ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
            cursor-pointer transition-all duration-100 text-lg`}
            >
              PRIVATE
            </Label>
          </div>
        </RadioGroup>
      </div>
      <div>
        <Label className=" text-lg">Externat content sources</Label>
        <DialogDescription>
          <div className="py-1">
            This setting allows users to add tracks from different sources. If
            no sources are selected, users can add tracks only by web view if
            they are logged in and playlist are public.
          </div>
          <div className="py-1">
            If you enable any external source in a few playlists in same time,
            requests will be set in all selected playlists, so be careful with
            it.
          </div>
        </DialogDescription>
        <ToggleGroup
          type="multiple"
          defaultValue={playlist.allow_sources}
          onValueChange={(value) => {
            console.log('ToggleGroup value:', value)

            setSettings({
              ...settings,
              allow_sources: value,
            })
            canRequest.current = true
          }}
          className="border-2 border-level-3 rounded-(--rounded-std) p-[1px] w-full bg-level-2"
        >
          <ToggleGroupItem
            value="twitch"
            className="data-[state=on]:bg-accent-3 hover:bg-level-3 px-2"
          >
            <div className="">Twitch</div>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="da"
            className="data-[state=on]:bg-accent-3 hover:bg-level-3"
          >
            <div className="px-2">Donation Alerts</div>
          </ToggleGroupItem>
          <ToggleGroupItem
            disabled
            value="youtube"
            className="data-[state=on]:bg-accent-3 hover:bg-level-3"
          >
            Youtube
          </ToggleGroupItem>
          <ToggleGroupItem
            disabled
            value="youtube"
            className="data-[state=on]:bg-accent-3 hover:bg-level-3"
          >
            Discord
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}

export default TabBasic
