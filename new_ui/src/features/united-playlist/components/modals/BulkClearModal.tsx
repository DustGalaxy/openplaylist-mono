import React from 'react'
import { toast } from 'sonner'
import { ListX } from 'lucide-react'
import { usePlaylistView } from '../../context/playlist-view-context'
import { splitQueue } from '@/stores/playlistStore/helpers'
import Btn from '@/components/ui/my-btn'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import { cn } from '@/lib/utils'

type GroupKey = 'vip' | 'regular' | 'background'

export default function BulkClearModal() {
  const { t, tc } = useFeatureTranslation()
  const { playlist, slot } = usePlaylistView()
  const { removeTracks } = usePlaylistStore()

  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<GroupKey>>(new Set())
  const [submitting, setSubmitting] = React.useState(false)

  if (!playlist) return null

  const { vip, regular, background } = splitQueue(playlist)

  const groups: Array<{ key: GroupKey; label: string; ids: Array<string> }> = [
    {
      key: 'vip',
      label: t('sort.tabs.vip', 'VIP'),
      ids: vip.map((tr) => tr.id),
    },
    {
      key: 'regular',
      label: t('sort.tabs.regular', 'Regular'),
      ids: regular.map((tr) => tr.id),
    },
    {
      key: 'background',
      label: t('sort.tabs.background', 'Background'),
      ids: background.map((tr) => tr.id),
    },
  ]

  const totalSelected = groups
    .filter((g) => selected.has(g.key))
    .reduce((acc, g) => acc + g.ids.length, 0)

  const toggleGroup = (key: GroupKey, count: number) => {
    if (count === 0) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSelected(new Set())
  }

  const handleConfirm = async () => {
    const ids = groups.filter((g) => selected.has(g.key)).flatMap((g) => g.ids)
    if (ids.length === 0) return

    setSubmitting(true)
    try {
      await removeTracks(slot, ids, 'removed')
      toast.success(
        t('playlist.bulkClear.success', 'Removed {{count}} tracks', {
          count: ids.length,
        }),
      )
      handleOpenChange(false)
    } catch {
      toast.error(t('playlist.bulkClear.error', 'Failed to remove tracks'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Btn
          title={t('playlist.bulkClear.trigger', 'Clear tracks')}
          className="p-1 bg-level-2 size-8 rounded-sm"
        >
          <ListX className="size-5" />
        </Btn>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 bg-level-1 border-level-3 text-text-main overflow-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t('playlist.bulkClear.title', 'Clear tracks')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'playlist.bulkClear.description',
              'Select groups to delete. This cannot be undone.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {groups.map((g) => {
            const count = g.ids.length
            const disabled = count === 0
            const checked = selected.has(g.key)
            return (
              <label
                key={g.key}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-sm px-2 py-1.5',
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-level-2',
                )}
              >
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleGroup(g.key, count)}
                  />
                  {g.label}
                </span>
                <span className="text-text-secondary text-sm">{count}</span>
              </label>
            )
          })}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Btn
              className="bg-level-2 px-2"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              {tc('common.cancel', 'Cancel')}
            </Btn>
            <Btn
              className="w-full bg-level-2 sm:w-auto px-2"
              disabled={submitting || totalSelected === 0}
              onClick={() => void handleConfirm()}
            >
              {submitting
                ? t('playlist.bulkClear.submitting', 'Deleting…')
                : t('playlist.bulkClear.confirm', 'Delete {{count}} tracks', {
                    count: totalSelected,
                  })}
            </Btn>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
