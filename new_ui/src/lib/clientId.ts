// src/lib/clientId.ts
/**
 * Единый идентификатор сессии текущей вкладки браузера.
 * Используется для фильтрации собственных WebSocket-событий (playback_seek, playback_pause),
 * чтобы предотвратить повторную обработку своих же команд (echo-cancellation).
 */
export const CLIENT_ID = Math.random().toString(36).substring(2, 15)
