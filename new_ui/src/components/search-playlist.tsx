import React from 'react'
import SearchBar from './searchbar'
import { getPublicPlaylists } from '@/api/api-playlist'

const SearchPlaylist = () => {
  const [search, setSearch] = React.useState('')

  const [playlists, setPlaylists] = React.useState([])
  const [notFound, setNotFound] = React.useState(false)
  const handleSearch = async () => {
    console.log(search)

    if (search === '') return

    const data = await getPublicPlaylists(search)
    setSearch('')
    console.log('data', data)

    if (data && data.length > 0) {
      setPlaylists(data)
      setNotFound(false)
    } else {
      setNotFound(true)
    }
  }

  return (
    <div className="w-full">
      <SearchBar
        value={search}
        setValue={setSearch}
        action={handleSearch}
        placeholder="Name of playlist, username or something in discription..."
      />
      <div className="grid grid-cols-1 [@media_(min-width:1150px)]:grid-cols-4 mt-4">
        {playlists.map((playlist: any) => (
          <div
            key={playlist.id}
            className="text-white flex flex-col items-start bg-level-2 p-4 gap-1 rounded-(--rounded-std)"
          >
            <div className="font-bold">
              <a href={`/view?p=${playlist.id}`}>{playlist.name}</a>
            </div>
            <div className="">{playlist.owner_nickname}</div>
            <div className="text-muted-foreground text-sm">
              {playlist.discription || 'Нет описания'}
            </div>
          </div>
        ))}
        {notFound && <div className="text-white">Плейлисты не найдены</div>}
      </div>
    </div>
  )
}

export default SearchPlaylist
