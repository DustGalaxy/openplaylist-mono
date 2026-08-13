# Подсистема авторизации и идентификации (Auth & Identity System)

Документация описывает архитектуру аутентификации, авторизации, управление сессиями, стратегии OAuth2/PKCE интеграций, механизмы разрешения коллизий учетных записей и защиту паролей в проекте **OpenPlaylist**.

---

## 1. Архитектурный обзор (Architecture Overview)

Подсистема авторизации состоит из 4 ключевых компонентов:
1. **Безопасная классическая аутентификация (Argon2id + Email Verification)**:
   - Использование криптографического алгоритма **Argon2id** (`argon2-cffi`) для хеширования паролей с проверкой необходимости перехеширования (`check_needs_rehash`).
   - Двухэтапная регистрация с сохранением временного состояния пользователя в Redis (`email_new_user_data:{email}:{session_id}`) до подтверждения email.
2. **Гибкая социальная авторизация (OAuth2 / PKCE + User Key)**:
   - Паттерн **Strategy Manager** (`strategy_manager.py`) для взаимодействия с платформами: Twitch, Google, DonationAlerts, DonatePay, DonateX.
   - Поддержка стандартов OAuth2 PKCE (`code_verifier`) и прямого ввода персональных ключей (`AuthFlow.USER_KEY`).
3. **Многоуровневая обработка коллизий емейлов (Email Collision & Merge)**:
   - Изоляция аккаунтов и безопасное слияние соцсетей через временные сессии в Redis (`link_sessions:{link_session_id}`).
4. **Сессионная защита на JWT & HTTP-Only Cookies**:
   - Генерация подписанных JWT-токенов (`HS256`), передаваемых в защищенных HTTP-Only сессионных куках (`httponly=True`, `secure=True`).

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентная архитектура подсистемы аутентификации (Data Flow Diagram)

```mermaid
flowchart TB
    subgraph Client ["/new_ui Client Interface"]
        UI["React App / Axios<br/><i>Cookie Credentials</i>"]
    end

    subgraph API ["FastAPI Adapters"]
        LoginRoutes["Login Routes<br/><i>/login/classic, /login/social</i>"]
        UserRoutes["User Routes<br/><i>/user/me, /user/integration</i>"]
        Deps["Dependencies<br/><i>CURR_USER (get_current_user)</i>"]
    end

    subgraph Service ["Auth Business Logic"]
        AuthSvc["AuthService<br/><i>auth_service.py</i>"]
        StratMgr["StrategyManager<br/><i>Twitch, Google, DA, DonatePay</i>"]
        Hasher["Argon2id Hasher<br/><i>PasswordHasher()</i>"]
    end

    subgraph StateCache ["Redis Transient Cache"]
        RedisReg[("email_new_user_data:*")]
        RedisLink[("link_sessions:*")]
    end

    subgraph DB ["PostgreSQL Database"]
        UserRepo[("AuthUser Table")]
        LinkRepo[("LinkedAccounts Table")]
        TokenVault[("TokenVault Table")]
    end

    subgraph External ["External OAuth Providers"]
        OAuthProviders["Twitch / Google / DA API"]
    end

    %% Flow connections
    UI -->|1. Credentials / OAuth Code| LoginRoutes
    LoginRoutes -->|2. Authenticate / Register| AuthSvc
    AuthSvc -->|3. Hash / Verify| Hasher
    AuthSvc -->|4. Exchange Code| StratMgr
    StratMgr -->|5. Token Request| OAuthProviders
    
    AuthSvc -->|6. Cache Registration / Merge Session| StateCache
    AuthSvc -->|7. Persist User / Link / Token| UserRepo
    UserRepo --- LinkRepo
    UserRepo --- TokenVault

    LoginRoutes -->|8. Set HTTP-Only JWT Cookie| UI
    UI -->|9. Authenticated Requests| Deps
    Deps -->|10. Decode JWT & Verify| AuthSvc
```

---

### 2.2. Диаграмма последовательности: Классическая регистрация и подтверждение Email (Registration Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as React UI (/login)
    participant API as FastAPI (/login/register & /email_confirmation)
    participant Auth as AuthService
    participant Redis as Redis Cache
    participant Email as Email Worker
    participant DB as PostgreSQL

    User->>UI: Ввод username, email, password
    UI->>API: POST /login/register (username, email, password)
    API->>Auth: register_classic(email, password, username)
    Auth->>Auth: Хеширование пароля через Argon2id
    Auth->>Redis: SET email_new_user_data:{email}:{session_id} (TTL: 24h)
    Auth->>Email: send_email(verification_link)
    API-->>UI: 202 Accepted ("need email confirmation")

    Note over User, UI: Пользователь переходит по ссылке из письма
    User->>UI: Переход по ссылке confirmation
    UI->>API: POST /login/email_confirmation (email, session_id)
    API->>Redis: GETDEL email_new_user_data:{email}:{session_id}
    Redis-->>API: user_data_json
    API->>Auth: create_user(AuthUserCreate)
    Auth->>DB: INSERT INTO auth_user (email_confirmed = true)
    Auth->>Auth: encode_jwt(user_id, username)
    API-->>UI: 200 OK + Set-Cookie: session_jwt (HTTP-Only)
```

---

### 2.3. Диаграмма последовательности: Социальная авторизация и разрешение коллизий (Social OAuth & Collision Resolution)

```mermaid
sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as React UI
    participant API as FastAPI (/login/social & /resolve_email_colision)
    participant Strat as StrategyManager (Twitch/Google/DA)
    participant Auth as AuthService
    participant Redis as Redis Cache
    participant DB as PostgreSQL

    User->>UI: Клик "Войти через Twitch/Google"
    UI->>Strat: Редирект на OAuth Provider (PKCE challenge)
    Strat-->>UI: Возврат с authorization code
    UI->>API: POST /login/social/{platform} (code, code_verifier)
    API->>Strat: Get user profile & tokens from OAuth Provider

    alt Уровень 1 & 2: Аккаунт привязан или найден по Email
        Strat-->>Auth: Profile & Tokens
        Auth->>DB: Upsert LinkedAccount & TokenVault
        Auth->>Auth: encode_jwt(user_id)
        API-->>UI: 200 OK + Set-Cookie: session_jwt
    else Уровень 3: Коллизия Email с существующим пользователем
        Auth-->>API: raise NeedConfirmationException(data)
        API->>Redis: SET link_sessions:{link_session_id} (data, TTL 10m)
        API-->>UI: 202 NEED_CONFIRMATION + link_session_id + display_info
        
        Note over User, UI: Показ модального окна разрешения коллизии
        User->>UI: Выбор: "Объединить аккаунты" или "Создать новый"
        
        UI->>API: POST /login/resolve_email_colision (link_session_id, is_confirmed)
        API->>Redis: GETDEL link_sessions:{link_session_id}
        
        alt is_confirmed = true (Объединить)
            API->>Auth: confirm_account_merge(data)
            Auth->>DB: Привязка LinkedAccount к существующему user_id
        else is_confirmed = false (Создать новый)
            API->>Auth: create_user + create_link
            Auth->>DB: Создание нового AuthUser и LinkedAccount
        end
        
        Auth->>Auth: encode_jwt(user_id)
        API-->>UI: 200 OK + Set-Cookie: session_jwt
    end
```

---

### 2.4. Матрица вариантов привязки и обработки уровней авторизации (Auth Levels Matrix)

```mermaid
stateDiagram-v2
    [*] --> IncomingOAuthRequest

    state "Уровень 1: Точный маппинг" as L1 {
        IncomingOAuthRequest --> CheckLinkedAccount: Search by platform and user ID
        CheckLinkedAccount --> DirectLogin: LinkedAccount found
    }

    state "Уровень 2: Совпадение по Email" as L2 {
        CheckLinkedAccount --> CheckEmailMatch: Not found by user ID
        CheckEmailMatch --> AutoLink: Email matches existing verified user
    }

    state "Уровень 3: Коллизия Email" as L3 {
        CheckEmailMatch --> NeedConfirmation: Email matches but confirmation required
        NeedConfirmation --> StoreRedisSession: Save temporary session to Redis
        StoreRedisSession --> UserDecision
        UserDecision --> MergeAccount: User confirms merge
        UserDecision --> CreateSeparateUser: User rejects merge
    }

    state "Уровень 4: Новый пользователь" as L4 {
        CheckEmailMatch --> RegisterNewUser: Email not found in DB
        RegisterNewUser --> CreateUserAndLink: Create User, Link and Token Vault
    }

    DirectLogin --> IssueJWT
    AutoLink --> IssueJWT
    MergeAccount --> IssueJWT
    CreateSeparateUser --> IssueJWT
    CreateUserAndLink --> IssueJWT
    IssueJWT --> [*]
```

---

## 3. Детальная спецификация компонентов и таблиц

### 3.1. Схема базы данных (PostgreSQL Models & Tables)
1. **`auth_user` (`src/models/auth_user.py` / `src/orm/auth_user.py`)**:
   - `id`: UUID (Primary Key).
   - `email`: String (Unique, Indexed).
   - `username`: String (Unique, Indexed).
   - `password`: String | None (Argon2id hash, null для социалок).
   - `email_confirmed`: Boolean.
   - `avatar_url`: String | None.
   - `roles`: JSONB list (список ролей пользователя).
   - `created_at`, `updated_at`: Timestamp.

2. **`linked_accounts` (`src/models/linked_accounts.py` / `src/orm/linked_accounts.py`)**:
   - `id`: UUID.
   - `user_id`: UUID (Foreign Key -> `auth_user.id`).
   - `platform`: Enum (`twitch`, `google`, `da`, `donatepay`, `donatex`).
   - `platform_user_id`: String (Идентификатор пользователя на внешней платформе).
   - `platform_username`: String.
   - `platform_email`: String | None.

3. **`token_vault` (`src/models/token_vault.py` / `src/orm/token_vault.py`)**:
   - `id`: UUID.
   - `user_id`: UUID (Foreign Key -> `auth_user.id`).
   - `platform`: Enum.
   - `access_token`: Encrypted String.
   - `refresh_token`: Encrypted String | None.
   - `expires_at`: BigInteger Timestamp.

### 3.2. Безопасность и алгоритмы шифрования
- **Password Hashing**: `Argon2id` с параметрами по умолчанию от `argon2-cffi`. Проверка устаревания параметров через `hasher.check_needs_rehash(user.password)`.
- **JWT Signatures**: `PyJWT` алгоритм `HS256`. Ключ `JWT_SECRET_KEY`, время жизни сессии задается `SESSION_LIVE_TIME` (по умолчанию 30 дней).
- **Cookie Security**:
  - `name`: `settings.COOKIE_NAME`
  - `httponly`: `True` (защита от XSS атак)
  - `secure`: `True` (передача только по HTTPS)
  - `samesite`: `lax` / `strict`

### 3.3. Брандмауэр и зависимость авторизации (`CURR_USER`)
В FastAPI эндпоинтах авторизация внедряется через зависимость:
```python
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]
```
При каждом запросе:
1. Зависимость `APIKeyCookie` извлекает токен из куки `settings.COOKIE_NAME`.
2. `auth_service.get_current_user` декодирует JWT и сверяет подпись.
3. Проверяется срок действия (`exp`).
4. Объект пользователя вычитывается из базы данных / кеша и передается в обработчик маршрута.
