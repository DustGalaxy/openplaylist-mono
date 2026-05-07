import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { ClientPlaylist, PlaylistSettings } from '@/types/playlist'

const TwitchPriority = ({
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
  const [costBroacaster, setCostBroacaster] = React.useState(
    playlist.settings.cost_broacaster,
  )

  const [costVip, setCostVip] = React.useState(playlist.settings.cost_vip)
  const [costMod, setCostMod] = React.useState(playlist.settings.cost_mod)
  const [costSubscriber, setCostSubscriber] = React.useState(
    playlist.settings.cost_subscriber,
  )
  const [costTurbo, setCostTurbo] = React.useState(playlist.settings.cost_turbo)
  const [costArtist, setCostArtist] = React.useState(
    playlist.settings.cost_artist,
  )
  const [costFollower, setCostFollower] = React.useState(
    playlist.settings.cost_follower,
  )

  return (
    <div>
      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <img
            src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1"
            alt=""
            className="w-[18px] h-[18px]"
          />
          <Label className=" text-lg">Broadcaster</Label>
        </div>

        <Input
          type="number"
          value={costBroacaster}
          className="border-level-3 border-1 w-20"
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostBroacaster(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_broacaster: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
        />
      </div>
      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <img
            src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1"
            alt=""
            className="w-[18px] h-[18px]"
          />
          <Label className=" text-lg">Moderator</Label>
        </div>

        <Input
          type="number"
          value={costMod}
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostMod(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_mod: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
          className="border-level-3 border-1 w-20"
        />
      </div>
      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <img
            src="https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3"
            alt=""
            className="w-[18px] h-[18px]"
          />
          <Label className=" text-lg">Vip</Label>
        </div>

        <Input
          type="number"
          value={costVip}
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostVip(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_vip: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
          className="border-level-3 border-1 w-20"
        />
      </div>
      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="var(--color-accent-1)"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path>
          </svg>
          <Label className=" text-lg">Subscriber</Label>
        </div>

        <Input
          type="number"
          value={costSubscriber}
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostSubscriber(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_subscriber: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
          className="border-level-3 border-1 w-20"
        />
      </div>

      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <img
            src="https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-91f4-af1e3428d80f/1"
            alt=""
            className="w-[18px] h-[18px]"
          />
          <Label className=" text-lg">Turbo</Label>
        </div>

        <Input
          type="number"
          value={costTurbo}
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostTurbo(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_turbo: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
          className="border-level-3 border-1 w-20"
        />
      </div>
      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <img
            src="https://assets.help.twitch.tv/article/img/000002399-05.png"
            alt=""
            className="w-[18px] h-[18px]"
          />
          <Label className=" text-lg">Artist</Label>
        </div>

        <Input
          type="number"
          value={costArtist}
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostArtist(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_artist: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
          className="border-level-3 border-1 w-20"
        />
      </div>
      <div className="flex justify-between gap-2 items-center">
        <div className="flex gap-2 items-center">
          <svg
            width="18px"
            height="18px"
            version="1.1"
            viewBox="0 0 20 20"
            x="0px"
            y="0px"
            fill="var(--color-accent-1)"
          >
            <path
              d="M9.171 4.171A4 4 0 0 0 6.343 3H6a4 4 0 0 0-4 4v.343a4 4 0 0 0 1.172 2.829L10 17l6.828-6.828A4 4 0 0 0 18 7.343V7a4 4 0 0 0-4-4h-.343a4 4 0 0 0-2.829 1.172L10 5l-.829-.829z"
              fillRule="evenodd"
            ></path>
          </svg>
          <Label className=" text-lg">Follower</Label>
        </div>
        <Input
          type="number"
          value={costFollower}
          onChange={(e) => {
            if (isNaN(parseInt(e.target.value))) return
            setCostFollower(parseInt(e.target.value))
            setSettings({
              ...settings,
              cost_follower: parseInt(e.target.value),
            })
            canRequest.current = true
          }}
          className="border-level-3 border-1 w-20"
        />
      </div>
    </div>
  )
}

export default TwitchPriority
