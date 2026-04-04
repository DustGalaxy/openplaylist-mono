import React from 'react'
import { Label } from '../ui/label'
import { DialogDescription } from '../ui/dialog'
import { Input } from '../ui/input'
import type { ClientPlaylist, PlaylistSettings } from '@/types/playlist'
import UpDownBtn from '../ui/funny-btn'
import { ButtonGroup } from '../ui/button-group'

const TabValidation = ({
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
  const [maxPlaylistSize, setMaxPlaylistSize] = React.useState(
    playlist.settings.max_playlist_size,
  )

  const minViewsRef = React.useRef<HTMLInputElement>(null)
  const minLikesRef = React.useRef<HTMLInputElement>(null)
  const maxDurationRef = React.useRef<HTMLInputElement>(null)
  const trackCooldownRef = React.useRef<HTMLInputElement>(null)
  const userCooldownRef = React.useRef<HTMLInputElement>(null)
  const donationCurrencyAmountRef = React.useRef<HTMLInputElement>(null)
  const maxPlaylistSizeRef = React.useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className="gap-1 flex flex-col">
        <Label className=" text-xl">Video validation</Label>
        <DialogDescription>
          Video validation settings. Can`t be negtive.
        </DialogDescription>
        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">Min views</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              ref={minViewsRef}
              value={minViews}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={minViewsRef} />
          </div>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">Min likes</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={minLikes}
              ref={minLikesRef}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={minLikesRef} />
          </div>
        </div>
        <DialogDescription>
          Not every video can have likes. 0 means all videos will pass likes
          validation.
        </DialogDescription>
        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">Max duration (sec)</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={maxDuration}
              ref={maxDurationRef}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={maxDurationRef} />
          </div>
        </div>

        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">Track cooldown (min)</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={trackCooldown}
              ref={trackCooldownRef}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={trackCooldownRef} />
          </div>
        </div>

        <DialogDescription>
          The time after which a track can be added again.
        </DialogDescription>

        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">User cooldown (min)</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={userCooldown}
              ref={userCooldownRef}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={userCooldownRef} />
          </div>
        </div>

        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">Max playlist size</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              dir="rtl"
              value={maxPlaylistSize}
              ref={maxPlaylistSizeRef}
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={maxPlaylistSizeRef} />
          </div>
        </div>

        <div className="flex justify-between gap-2 items-center">
          <Label className="text-lg">Donation currency amount</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              dir="rtl"
              value={donationCurrencyAmount}
              ref={donationCurrencyAmountRef}
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
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
            <UpDownBtn inputRef={donationCurrencyAmountRef} />
          </div>
        </div>

        <DialogDescription>
          Please indicate the amount in the currency in which you accept
          donations. (Needs donation platform integration)
        </DialogDescription>
      </div>
    </div>
  )
}

export default TabValidation
