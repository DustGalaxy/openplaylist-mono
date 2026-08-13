# Подсистема управления плейлистами и модерации (Playlist & Permissions System)

Документация описывает архитектуру управления плейлистами, гибкую конфигурацию режимов воспроизведения, систему разграничения прав модераторов и генерацию токенов приглашения в проекте **OpenPlaylist**.

---

## 1. Архитектурный обзор (Architecture Overview)

Подсистема включает в себя функционал конструирования плейлистов и разграничения доступа:

1. **Конфигуратор плейлиста и режимы работы (Playlist Settings)**:
   - **Режимы воспроизведения (`mode`)**:
     - `stream`:  Динамический поток заказов пользователей с черным списком и правилами с поддержкой фоновых треков (`background_track_ids`).
     - `static`: Статический зафиксированный список воспроизведения.
   - **Режимы стоимости заказов (`cost_mode`)**: `add` (суммирование стоимости) или `max` (выбор максимальной ставки).
   - **Фильтры источников (`allow_sources`)**: Ограничения источников (YouTube, VK, Web, etc.).
   - **Черные списки и фоновые треки**: `track_black_list` и `background_track_ids`.

2. **Система модерации и прав доступа (Moderation & RBAC)**:
   - **Единственный Владелец (Owner)**: Имеет абсолютные права над плейлистом (управление настройками, модераторами, очередью и плейбеком).
   - **Модераторы (Moderators)**: Авторизованные пользователи с гранулярным набором прав:
     - `can_manage_queue`: Добавление, удаление, перемещение треков в очереди.
     - `can_manage_playback`: Управление воспроизведением (пауза, резюм, перемотка, Remote Control).
     - `can_manage_settings`: Изменение настроек плейлиста (режимы, источники, правила).
   - **Ссылки-приглашения (Moderator Tokens)**: Генерация одноразовых или многоразовых токенов доступа с ограниченным сроком действия (`expires_at`).

3. **Защита доступа в FastAPI (`MODERATOR_ACCESS`)**:
   - Внедрение зависимости `get_playlist_moderator_access`: извлечение токена из заголовока `X-Moderator-Token` или Query-параметра `token`, сопоставление с ролями пользователя и вычисление текущих прав (`ModeratorAccessInfo`).

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентная архитектура управления плейлистами (Data Flow Diagram)

```mermaid
flowchart TB
    subgraph Client ["/new_ui Client Interface"]
        UI["React Playlist UI<br/><i>usePlaylistAccess.ts</i>"]
        SettingsModal["Settings Modal<br/><i>TabBasic.tsx / TabModerators.tsx</i>"]
    end

    subgraph API ["FastAPI Adapters"]
        PlstRoutes["Playlist Routes<br/><i>/playlist/*</i>"]
        ModRoutes["Moderator Routes<br/><i>/moderator/*</i>"]
        DepMod["Dependency<br/><i>MODERATOR_ACCESS</i>"]
    end

    subgraph Service ["Playlist & Moderator Business Logic"]
        PlstSvc["PlaylistService<br/><i>basic_service.py</i>"]
        ModSvc["ModeratorService<br/><i>moderator_service.py</i>"]
        RulesSvc["RulesService<br/><i>rules_service.py</i>"]
    end

    subgraph DB ["PostgreSQL Database"]
        PlstRepo[("Playlist Table")]
        ModRepo[("PlaylistModerator Table")]
        UserRepo[("AuthUser Table")]
    end

    subgraph RealtimeBus ["RabbitMQ & Socket.IO Bus"]
        Publisher["RabbitMQ Publisher<br/><i>playlist_fanout_exchange</i>"]
        SIO["Socket.IO Server<br/><i>settings_changed:{id}</i>"]
    end

    %% Flow connections
    UI -->|1. Fetch / Update Playlist| PlstRoutes
    SettingsModal -->|2. Manage Moderators / Tokens| ModRoutes
    
    PlstRoutes -->|3. Validate Permissions| DepMod
    DepMod -->|4. Resolve Access Info| ModSvc

    PlstRoutes -->|5. Apply Settings Patch| PlstSvc
    ModRoutes -->|6. CRUD Moderator Tokens| ModSvc

    PlstSvc -->|7. Persist to DB| PlstRepo
    ModSvc -->|8. Persist Moderators| ModRepo

    PlstSvc -->|9. Publish PLAYLIST_SETTINGS_CHANGED| Publisher
    Publisher -->|10. Emit WebSocket Update| SIO
    SIO -->|11. Sync UI Settings| UI
```

---

### 2.2. Диаграмма последовательности: Создание и активация токена модератора (Moderator Token Activation)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Владелец плейлиста
    actor ModUser as Гость / Будущий модератор
    participant UI as React UI (TabModerators)
    participant API as FastAPI (/playlist/{id}/moderators/token)
    participant ModSvc as ModeratorService
    participant DB as PostgreSQL (playlist_moderator)

    Owner->>UI: Создание приглашения (выбор прав & exp_time)
    UI->>API: POST /playlist/{id}/moderators/token (permissions, expires_at)
    API->>ModSvc: create_moderator_token(...)
    ModSvc->>ModSvc: Генерация криптографического токена (secrets.token_urlsafe)
    ModSvc->>DB: INSERT INTO playlist_moderator (token, is_activated=false)
    API-->>UI: 200 OK + invite_link (e.g. /playlist/id?token=XYZ)

    Note over Owner, ModUser: Передача ссылки модератору
    ModUser->>UI: Переход по ссылке приглашения
    UI->>API: POST /playlist/{id}/moderators/accept?token=XYZ
    API->>ModSvc: accept_moderator_token(token, mod_user_id)
    ModSvc->>DB: UPDATE playlist_moderator (user_id=mod_user_id, is_activated=true, token=null)
    API-->>UI: 200 OK (Модератор привязан к учетной записи)
```

---

### 2.3. Диаграмма последовательности: Изменение настроек плейлиста (Playlist Patch & Realtime Sync)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Владелец / Модератор (can_manage_settings)
    participant UI as React UI (SettingsModal)
    participant API as FastAPI (PATCH /playlist/{id})
    participant Dep as MODERATOR_ACCESS
    participant PlstSvc as PlaylistService
    participant DB as PostgreSQL
    participant Rabbit as RabbitMQ (main_publisher)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Viewers as Слушатели плейлиста

    Admin->>UI: Изменение режима / правил / черного списка
    UI->>API: PATCH /playlist/{playlist_id} (PlaylistPatch payload)
    API->>Dep: get_playlist_moderator_access(playlist_id)
    Dep-->>API: ModeratorAccessInfo (can_manage_settings = true)
    
    API->>PlstSvc: patch_playlist(playlist_id, patch_schema)
    PlstSvc->>DB: UPDATE playlist & playlist_settings
    
    PlstSvc->>Rabbit: main_publisher.publish(PLAYLIST_SETTINGS_CHANGED, playlist_fanout_exchange)
    API-->>UI: 200 OK (ReadPlaylist)

    Rabbit->>SIO: FastStream worker (log_router / callback_router)
    SIO->>Viewers: Emit settings_changed:{playlist_id} (Partial<Playlist>)
    Note over Viewers: Автоматическое обновление правил в UI клиентов.
```

---

### 2.4. Матрица уровней доступа и прав (Access Control Hierarchy)

```mermaid
stateDiagram-v2
    [*] --> AnonymousRequest

    state "Гость или Anon Viewer" as Anon {
        [*] --> CheckPublic
        CheckPublic --> PublicAccess: Playlist is public
        PublicAccess --> ViewTracks: View tracks and listen
        CheckPublic --> DenyAccess: Playlist is private
    }

    state "Авторизованный Гость" as AuthGuest {
        [*] --> CheckOwnerOrMod
        CheckOwnerOrMod --> CanRequestTracks: Can order tracks
    }

    state "Модератор (Moderator)" as Mod {
        [*] --> CheckPermissions
        CheckPermissions --> QueueOps: Manage queue enabled
        CheckPermissions --> PlaybackOps: Manage playback enabled
        CheckPermissions --> SettingsOps: Manage settings enabled
    }

    state "Владелец (Owner)" as Owner {
        [*] --> FullAccess: Full control over settings and mods
    }
```

---

## 3. Детальная спецификация моделей и пермишенов

### 3.1. Структура сущности `playlist_moderator`

- `id`: UUID.
- `playlist_id`: UUID (Foreign Key -> `playlist.id`).
- `user_id`: UUID | None (Заполняется при активации токена).
- `token`: String | None (Уникальный одноразовый/многоразовый токен).
- `permissions`: JSONB Объект:

  ```json
  {
    "can_manage_queue": true,
    "can_manage_playback": true,
    "can_manage_settings": false
  }
  ```

- `is_activated`: Boolean.
- `expires_at`: Timestamp | None.

### 3.2. Права и проверки в API

- **Владелец**: `is_owner = True` $\rightarrow$ все права в `ModeratorAccessInfo` устанавливаются в `True`.
- **Проверка пермишенов в роутах**:

  ```python
  if not access.permissions.get("can_manage_settings", False):
      raise HTTPException(status_code=403, detail="Moderator missing permissions")
  ```
