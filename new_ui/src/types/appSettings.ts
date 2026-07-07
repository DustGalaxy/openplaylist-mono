export type MoveMethod = 'arrows' | 'dnd'

/** Растёт по мере добавления новых app-настроек. */
export type AppSettings = {
  moveMethod: MoveMethod
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  moveMethod: 'arrows',
}