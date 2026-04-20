import Trash from './icons/icon-trash'
import Btn from './ui/my-btn'
import type { ClientPlaylist } from '@/types/playlist'
import { useMusicStore } from '@/stores/musicStore'
import type { ReadBlockList } from '@/types/playlist'

const BlockItem = ({
  text,
  unBlockCallback,
}: {
  text: string
  unBlockCallback: (item: string) => Promise<void>
}) => {
  return (
    <div className="flex gap-2 justify-between border-1 rounded-(--rounded-std) border-level-3">
      <p className="text-text-main flex items-center px-2 py-1">{text}</p>
      <button
        onClick={async () => {
          await unBlockCallback(text)
        }}
        className="p-1 m-1 bg-level-2 border-none shadow-none rounded-(--rounded-std) cursor-pointer 
      hover:bg-level-3"
      >
        <Trash width={25} height={25} />
      </button>
    </div>
  )
}

export default function BlockList({
  list,
  type,
  playlist,
}: {
  list: Array<ReadBlockList>
  type: 'user' | 'track'
  playlist: ClientPlaylist
}) {
  const { requestPlSettings } = useMusicStore()
  const handleUnblock = async (item: string) => {
    return

    if (type === 'user') {
      await requestPlSettings(playlist.id, {
        block_list: playlist.settings.block_list.filter(
          (user) =>
            user.toString().toLowerCase() !== item.toString().toLowerCase(),
        ),
      })
    } else {
      console.log('Unblocking track:', item)

      await requestPlSettings(playlist.id, {
        track_black_list: playlist.settings.track_black_list.filter(
          (track) => track.toString() !== item.toString(),
        ),
      })
    }
  }
  return (
    <div className="flex flex-col gap-2 ">
      {list.map((item, index) => {
        return (
          <BlockItem key={index} text={item} unBlockCallback={handleUnblock} />
        )
      })}
    </div>
  )
}
