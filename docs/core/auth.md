# Auth & Identity System Architecture

This document describes the authentication, authorization, session management, OAuth2/PKCE integration strategies, account collision resolution, and password security in the **OpenPlaylist** platform.

---

## 1. Architecture Overview

The authentication and identity subsystem consists of 4 core architectural modules:

1. **Secure Classic Authentication (Argon2id + Email Verification):**
   - Password hashing utilizing cryptographic **Argon2id** (`argon2-cffi`) with automatic parameter rehash verification (`check_needs_rehash`).
   - Two-phase registration staging unconfirmed account records in Redis (`email_new_user_data:{email}:{session_id}`) until email link activation.
2. **Pluggable Social Authentication (OAuth2 / PKCE + User Key):**
   - **Strategy Manager Pattern** (`strategy_manager.py`) abstracting external platform handshakes: Twitch, Google, DonationAlerts, DonatePay, DonateX.
   - Support for OAuth2 PKCE (`code_verifier`) and direct personal token ingestion (`AuthFlow.USER_KEY`).
3. **Multi-Level Email Collision & Account Merging:**
   - Account isolation with secure user-confirmed social profile merging coordinated via temporary Redis sessions (`link_sessions:{link_session_id}`).
4. **Session Integrity via JWT & HTTP-Only Cookies:**
   - Cryptographically signed JWT tokens (`HS256`/`RS256`) transported exclusively within secure HTTP-Only session cookies (`httponly=True`, `secure=True`).

---

## 2. System Diagrams

### 2.1. Authentication Subsystem Architecture (Data Flow Diagram)

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

### 2.2. Sequence Diagram: Classic Registration & Email Confirmation

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as React UI (/login)
    participant API as FastAPI (/login/register & /email_confirmation)
    participant Auth as AuthService
    participant Redis as Redis Cache
    participant Email as Email Worker
    participant DB as PostgreSQL

    User->>UI: Input username, email, password
    UI->>API: POST /login/register (username, email, password)
    API->>Auth: register_classic(email, password, username)
    Auth->>Auth: Hash password via Argon2id
    Auth->>Redis: SET email_new_user_data:{email}:{session_id} (TTL: 24h)
    Auth->>Email: send_email(verification_link)
    API-->>UI: 202 Accepted ("need email confirmation")

    Note over User, UI: User receives email and clicks confirmation link
    User->>UI: Navigate to confirmation URL
    UI->>API: POST /login/email_confirmation (email, session_id)
    API->>Redis: GETDEL email_new_user_data:{email}:{session_id}
    Redis-->>API: user_data_json
    API->>Auth: create_user(AuthUserCreate)
    Auth->>DB: INSERT INTO auth_user (email_confirmed = true)
    Auth->>Auth: encode_jwt(user_id, username)
    API-->>UI: 200 OK + Set-Cookie: session_jwt (HTTP-Only)
```

---

### 2.3. Sequence Diagram: Social OAuth & Collision Resolution

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as React UI
    participant API as FastAPI (/login/social & /resolve_email_colision)
    participant Strat as StrategyManager (Twitch/Google/DA)
    participant Auth as AuthService
    participant Redis as Redis Cache
    participant DB as PostgreSQL

    User->>UI: Click "Login with Twitch / Google"
    UI->>Strat: Redirect to OAuth Provider (PKCE challenge)
    Strat-->>UI: Redirect callback with authorization code
    UI->>API: POST /login/social/{platform} (code, code_verifier)
    API->>Strat: Fetch user profile & tokens from OAuth Provider

    alt Level 1 & 2: Account Linked or Email Match
        Strat-->>Auth: Profile & Tokens
        Auth->>DB: Upsert LinkedAccount & TokenVault
        Auth->>Auth: encode_jwt(user_id)
        API-->>UI: 200 OK + Set-Cookie: session_jwt
    else Level 3: Email Collision with Existing Account
        Auth-->>API: raise NeedConfirmationException(data)
        API->>Redis: SET link_sessions:{link_session_id} (data, TTL 10m)
        API-->>UI: 202 NEED_CONFIRMATION + link_session_id + display_info
        
        Note over User, UI: Display Collision Resolution Dialog
        User->>UI: Choose: "Merge Accounts" or "Create Separate Account"
        
        UI->>API: POST /login/resolve_email_colision (link_session_id, is_confirmed)
        API->>Redis: GETDEL link_sessions:{link_session_id}
        
        alt is_confirmed = true (Merge Accounts)
            API->>Auth: confirm_account_merge(data)
            Auth->>DB: Bind LinkedAccount to existing user_id
        else is_confirmed = false (Create New)
            API->>Auth: create_user + create_link
            Auth->>DB: Insert new AuthUser and LinkedAccount
        end
        
        Auth->>Auth: encode_jwt(user_id)
        API-->>UI: 200 OK + Set-Cookie: session_jwt
    end
```

---

### 2.4. Authentication Level Resolution Matrix

```mermaid
stateDiagram-v2
    [*] --> IncomingOAuthRequest

    state "Level 1: Exact Match" as L1 {
        IncomingOAuthRequest --> CheckLinkedAccount: Search by platform and user ID
        CheckLinkedAccount --> DirectLogin: LinkedAccount found
    }

    state "Level 2: Verified Email Match" as L2 {
        CheckLinkedAccount --> CheckEmailMatch: Not found by platform user ID
        CheckEmailMatch --> AutoLink: Email matches existing verified user
    }

    state "Level 3: Email Collision Confirmation" as L3 {
        CheckEmailMatch --> NeedConfirmation: Email matches but confirmation required
        NeedConfirmation --> StoreRedisSession: Save temporary session to Redis
        StoreRedisSession --> UserDecision
        UserDecision --> MergeAccount: User confirms merge
        UserDecision --> CreateSeparateUser: User rejects merge
    }

    state "Level 4: New User Registration" as L4 {
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

## 3. Data Model & Security Specifications

### 3.1. Database Schema (PostgreSQL Models)

1. **`auth_user` (`src/models/auth_user.py` / `src/orm/auth_user.py`):**
   - `id`: UUID (Primary Key).
   - `email`: String (Unique, Indexed).
   - `username`: String (Unique, Indexed).
   - `password`: String | None (Argon2id hash, null for OAuth-only users).
   - `email_confirmed`: Boolean.
   - `avatar_url`: String | None.
   - `roles`: JSONB list (User roles array).
   - `created_at`, `updated_at`: Timestamp.

2. **`linked_accounts` (`src/models/linked_accounts.py` / `src/orm/linked_accounts.py`):**
   - `id`: UUID.
   - `user_id`: UUID (Foreign Key -> `auth_user.id`).
   - `platform`: Enum (`twitch`, `google`, `da`, `donatepay`, `donatex`).
   - `platform_user_id`: String (External user identifier).
   - `platform_username`: String.
   - `platform_email`: String | None.

3. **`token_vault` (`src/models/token_vault.py` / `src/orm/token_vault.py`):**
   - `id`: UUID.
   - `user_id`: UUID (Foreign Key -> `auth_user.id`).
   - `platform`: Enum.
   - `access_token`: Encrypted String.
   - `refresh_token`: Encrypted String | None.
   - `expires_at`: BigInteger Timestamp.

### 3.2. Security & Cryptographic Standards

- **Password Hashing**: `Argon2id` via `argon2-cffi`. Outdated hash parameters checked via `hasher.check_needs_rehash(user.password)`.
- **JWT Signatures**: `PyJWT` algorithm `RS256` / `HS256`. Session validity configured by `SESSION_LIVE_TIME` (default: 30 days).
- **Cookie Hardening**:
  - `name`: `settings.COOKIE_NAME`
  - `httponly`: `True` (Protection against XSS token exfiltration)
  - `secure`: `True` (Enforced HTTPS transmission)
  - `samesite`: `lax` / `strict`

### 3.3. Route Authentication Guard (`CURR_USER`)

In FastAPI route endpoints, authentication is injected via dependency injection:

```python
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]
```

On every request:
1. `APIKeyCookie` extracts the token from the secure cookie.
2. `auth_service.get_current_user` decodes the JWT and validates signature integrity.
3. Expiration claim (`exp`) is verified.
4. User entity is fetched from the database / cache and supplied to the route handler.
