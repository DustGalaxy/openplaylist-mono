# Краткий экскурс: Архитектура Плеера и Модерации V2 (Quick Reference)

> **Назначение:** Быстрая шпаргалка и контекст для последующих сессий разработки.

---

## 1. Концепция UserPlayer V2 & Модели Состояния

1. **UserPlayer в Redis (`player:{owner_id}`):**
   * Состояние плеера стримера хранится в **Redis Hash** с TTL (7 дней с автопродлением).
   * Структура: `owner_id`, `active_playlist_id`, `current_track_id`, `current_track_data` (JSON), `position`, `is_paused`, `volume`, `broadcast_to_widget`, `last_client_id`, `updated_at`.
   * OBS-виджет (`/widget`) и модераторы в режиме управления читают и синхронизируются с этим состоянием.

2. **Два режима плеера (`usePlaybackStore.playerMode`):**
   * **`'listen'` (Слушаю / Локальный режим):**
     * Пользователь/модератор слушает музыку для себя в браузере (звук включён).
     * Любые действия (клик по треку, пауза, перемотка, скип) выполняются **локально** и **НЕ отправляются стримеру**.
     * События со стрима не перебивают играющий локально трек.
   * **`'control'` (Управление трансляцией):**
     * Модератор управляет стримом выбранного канала (`activeChannel.owner_id`).
     * Локальный звук в браузере модератора заглушен (`volume = 0`), чтобы не дублировать стрим.
     * Действия транслируются на бэкенд через `/player/{owner_id}/*` и Socket.IO.

3. **Синхронизация для зрителей (`acceptSync`):**
   * Обычные зрители могут включить кнопку синхронизации («Радио»), чтобы слушать стрим синхронно в браузере (`acceptSync: true`).

---

## 2. Фильтрация Эха (`CLIENT_ID`) и Правила Broadcast

### Правило отправки (`shouldBroadcast`):
```ts
// Команды отправляются на стрим ТОЛЬКО если пользователь — владелец,
// либо модератор в активном режиме 'control'
const shouldBroadcast =
  role === 'owner' ||
  ((role === 'operator' || canControlPlayback) && playerMode === 'control')
```

### Правило приёма входящих событий (Socket.IO):
* Всегда проверяется: `incoming.client_id !== CLIENT_ID` (игнорировать собственные события).
* Локальный слот плеера обновляется только при: `isOwner || playerMode === 'control' || acceptSync`.

---

## 3. Специфика ReactPlayer v3.4.0 (`@muxinc/youtube-video-element`)

1. **Обязательный `src`:**
   * В `react-player` 3.x для YouTube используется кастомный HTML5 элемент. Необходимо передавать `<ReactPlayer src={videoUrl} ... />` (а не только legacy `url`).
2. **HTML5 Event Handlers:**
   * Прогресс и длительность читаются через стандартные события: `onTimeUpdate`, `onDurationChange`, `onLoadedMetadata`, `onPlay`, `onPause`, `onEnded`.
3. **Защита от ложных пауз:**
   * `handlePause` проверяет готовность плеера, чтобы события буферизации YouTube не сбрасывали флаг `feed.playing`.

---

## 4. Памятка по разработке и командам

* **Python Backend (`back-end/`):**
  * Всегда использовать `uv`!
  * Запуск тестов: `uv run pytest`
  * Запуск скриптов: `uv run python <script.py>`
* **React Frontend (`new_ui/`):**
  * Запуск тестов: `npx vitest run`
* **UI Компоненты (`Btn`):**
  * Компонент `Btn` (`src/components/ui/my-btn.tsx`) содержит встроенные 3D-стили и тени — **не добавлять** лишние `hover:bg-*` или `hover:text-*`.
