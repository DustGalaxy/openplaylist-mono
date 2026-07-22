const KEY = 'player-session'

interface PlayerSession {
  playlistId: string
  trackId: string
}

export function savePlayerSession(session: PlayerSession | null) {
  if (!session) {
    localStorage.removeItem(KEY)
    return
  }
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function loadPlayerSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
