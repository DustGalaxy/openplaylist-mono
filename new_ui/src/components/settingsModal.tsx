import React from 'react'
import Settings from './icons/icon-settings'
import { Input } from './ui/input'
import { Label } from './ui/label'
import Btn from './ui/my-btn'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import BlockList from './block-list'
import Add from './icons/icon-add'
import type { ClientPlaylist, PlaylistSettings } from '@/types/playlist'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import useMusicStore from '@/stores/musicStore'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import { deletePlaylist } from '@/api/api-playlist'

export default function SettingsModal({
  playlist,
}: {
  playlist: ClientPlaylist
}) {
  const [plstMode, setPlstMode] = React.useState(playlist.settings.mode)
  const [privacy, setPrivacy] = React.useState(playlist.settings.is_public)
  const [minViews, setMinViews] = React.useState(playlist.settings.min_views)
  const [minLikes, setMinLikes] = React.useState(playlist.settings.min_likes)
  const [maxDuration, setMaxDuration] = React.useState(
    playlist.settings.max_duration,
  )
  const [trackCooldown, setTrackCooldown] = React.useState(
    playlist.settings.track_cooldown,
  )
  const [userCooldown, setUserCooldown] = React.useState(
    playlist.settings.user_cooldown,
  )
  const [donationCurrencyAmount, setDonationCurrencyAmount] = React.useState(
    playlist.settings.donation_currency_amount,
  )
  const [costMode, setCostMode] = React.useState(playlist.settings.cost_mode)
  const [costBroacaster, setCostBroacaster] = React.useState(
    playlist.settings.cost_broacaster,
  )
  const [costDonater, setCostDonater] = React.useState(
    playlist.settings.cost_donater,
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
  const [costFonder, setCostFonder] = React.useState(
    playlist.settings.cost_fonder,
  )
  const [costFollower, setCostFollower] = React.useState(
    playlist.settings.cost_follower,
  )

  const [settings, setSettings] = React.useState<PlaylistSettings>(
    playlist.settings,
  )

  const [countToDelete, setCountToDelete] = React.useState(3)
  const [deleteTimeout, setDeleteTimeout] = React.useState(false)

  const [maxPlaylistSize, setMaxPlaylistSize] = React.useState(
    playlist.settings.max_playlist_size,
  )

  const { requestPlSettings } = useMusicStore()

  const canRequest = React.useRef(false)
  useDebouncedEffect(
    settings,
    async () => {
      if (!canRequest.current) return
      canRequest.current = false
      await requestPlSettings(playlist.name, settings)
    },
    2000,
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Btn
          text={<Settings />}
          className="flex w-[50px] bg-level-2"
          onClick={() => setCountToDelete(3)}
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-level-1 border-level-3 text-white h-[700px] overflow-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl">Playlist settings</DialogTitle>
          <DialogDescription>
            Here you can change your playlist settings. Saving automatically
          </DialogDescription>
        </DialogHeader>
        <div className="h-[1px] bg-level-3" />
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
            onValueChange={async (e) => {
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
        {/* Video validation */} <div className="h-[1px] bg-level-3" />
        <div className="gap-1 flex flex-col">
          <Label className=" text-xl">Video validation</Label>
          <DialogDescription>
            Video validation settings. Can`t be negtive.
          </DialogDescription>
          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">Min views</Label>
            <Input
              type="number"
              value={minViews}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                ) {
                  return
                }
                setMinViews(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  min_views: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>
          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">Min likes</Label>
            <Input
              type="number"
              value={minLikes}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                ) {
                  return
                }
                setMinLikes(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  min_likes: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>
          <DialogDescription>
            Not every video can have likes. 0 means all videos passed likes
            validation.
          </DialogDescription>
          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">Max duration (sec)</Label>
            <Input
              type="number"
              value={maxDuration}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                )
                  return
                setMaxDuration(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  max_duration: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>

          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">Track cooldown (min)</Label>
            <Input
              type="number"
              value={trackCooldown}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                )
                  return
                setTrackCooldown(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  track_cooldown: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>

          <DialogDescription>
            The time after which a track can be added again.
          </DialogDescription>

          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">User cooldown (min)</Label>
            <Input
              type="number"
              value={userCooldown}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                )
                  return
                setUserCooldown(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  user_cooldown: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>

          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">Donation currency amount</Label>
            <Input
              type="number"
              value={donationCurrencyAmount}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                )
                  return
                setDonationCurrencyAmount(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  donation_currency_amount: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>

          <DialogDescription>
            Please indicate the amount in the currency in which you accept
            donations. (Needs donation alerts integration)
          </DialogDescription>

          <div className="flex justify-between gap-2 items-center">
            <Label className=" text-lg">Max playlist size</Label>
            <Input
              type="number"
              value={maxPlaylistSize}
              className="border-level-3 border-1 w-30"
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                )
                  return
                setMaxPlaylistSize(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  max_playlist_size: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
          </div>

          {/* Priority settings */}
          <div className="h-[1px] bg-level-3" />
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
                onValueChange={async (e) => {
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
                    className={`${playlist.settings.cost_mode === 'add' ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
            flex cursor-pointer transition-all duration-100 text-lg`}
                  >
                    ADD
                  </Label>
                </div>
                <div
                  className={`flex items-center  cursor-pointer bg-level-2
          py-1 pr-4 pl-[2px] rounded-r-(--rounded-std) justify-start`}
                >
                  <RadioGroupItem
                    value="max"
                    id="cost-max-id"
                    className="sr-only"
                  />
                  <Label
                    htmlFor="cost-max-id"
                    className={`${playlist.settings.cost_mode === 'max' ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
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

            {/* Cost settings */}
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
          {/* Black lists */}
          <div className="h-[1px] bg-level-3" />
          <div>
            <div className="">
              <Label className=" text-xl">Block Lists</Label>
              <DialogDescription>
                <p>An block users or tracks.</p>
              </DialogDescription>
              {/* <Btn
                text={<Add width={25} height={25} />}
                className="ml-auto px-1 mb-1"
              /> */}
            </div>

            <div className="flex flex-col gap-2 mt-2 w-full">
              {playlist.settings.user_black_list.length > 0 ? (
                <BlockList
                  list={playlist.settings.user_black_list}
                  type="user"
                  playlist={playlist}
                />
              ) : (
                <div className="flex text-muted-foreground text-sm justify-center w-full">
                  <p>No users block.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-2 w-full">
              {playlist.settings.track_black_list.length > 0 ? (
                <BlockList
                  list={playlist.settings.track_black_list}
                  type="track"
                  playlist={playlist}
                />
              ) : (
                <div className="flex text-muted-foreground text-sm justify-center w-full">
                  <p>No tracks block.</p>
                </div>
              )}
            </div>
          </div>
          <div className="h-[1px] bg-level-3" />

          {/* Delete playlist */}
          <div className="gap-1 flex justify-between mb-4">
            <Label className="text-red-500 text-xl">Delete playlist</Label>
            <div className="flex gap-2">
              <Label className="text-red-500 text-xl"> {countToDelete}</Label>
              <Btn
                text={<div className="py-1 px-2">Delete</div>}
                className=""
                disabled={deleteTimeout || countToDelete === 0}
                onClick={async () => {
                  if (countToDelete > 1) {
                    setCountToDelete(countToDelete - 1)
                    setDeleteTimeout(true)
                    setTimeout(() => {
                      setDeleteTimeout(false)
                    }, 1000)
                  } else if (countToDelete === 1) {
                    await deletePlaylist(playlist.id)
                    useMusicStore.getState().deletePlaylist(playlist.id)
                    setCountToDelete(countToDelete - 1)
                  } else {
                    setCountToDelete(3)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
