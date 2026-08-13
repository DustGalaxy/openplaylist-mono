const MOD_TOKEN_PREFIX = 'op_mod_token_'

export function getModeratorToken(playlistId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`${MOD_TOKEN_PREFIX}${playlistId}`)
}

export function setModeratorToken(playlistId: string, token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${MOD_TOKEN_PREFIX}${playlistId}`, token)
}

export function removeModeratorToken(playlistId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${MOD_TOKEN_PREFIX}${playlistId}`)
}
