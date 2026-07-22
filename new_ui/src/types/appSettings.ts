export type MoveMethod = 'arrows' | 'dnd'

/** Растёт по мере добавления новых app-настроек. */
export type AppSettings = {
  moveMethod: MoveMethod
  playerVolume: number
  playerMutedVolume: number
  playerPlaybackRate: number
  playerHidden: boolean
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  moveMethod: 'arrows',
  playerVolume: 1,
  playerMutedVolume: 0,
  playerPlaybackRate: 1,
  playerHidden: true,
}
