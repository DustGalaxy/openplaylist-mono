# Auth Strategy Pattern - Architecture Diagram

## Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                         │
│  (TwitchLoginButton, LinkAccountModal, etc.)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ useAuthLogin('twitch', { navigate })
                         │ useIntegration('twitch', { navigate })
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Generic Hooks (useAuth.tsx)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  useAuthLogin(platform, { navigate })                   │  │
│  │  useIntegration(platform, { navigate })                 │  │
│  │  useCurrentUserQuery()                                  │  │
│  │  useLogoutMutation()                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ authStrategyManager.getStrategy(platform)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│         AuthStrategyManager (authStrategyManager.ts)           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Registry:                                              │  │
│  │  - integrationStrategies: Map<string, Strategy>        │  │
│  │  - loginStrategies: Map<string, Strategy>              │  │
│  │                                                          │  │
│  │  Methods:                                               │  │
│  │  - getIntegrationStrategy(platform)                     │  │
│  │  - getLoginStrategy(platform)                           │  │
│  │  - getRegisteredPlatforms()                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    [Twitch]         [DA]          [YouTube*]
         │               │               │
┌────────▼───────┐  ┌────▼────────┐  ┌──▼─────────────┐
│TwitchAuthStrat.│  │DaAuthStrateg.│  │YouTubeAuthStr. │
│                │  │             │  │ (example)      │
│- endpoint      │  │- endpoint   │  │                │
│- format payload│  │- format pay.│  │- endpoint      │
│- errors        │  │- errors     │  │- format pay.   │
│- collision msg │  │- collision  │  │- errors        │
└────────────────┘  └─────────────┘  └────────────────┘
```

## Data Flow

### 1. Login Flow with Twitch
```
Component (TwitchLoginButton)
    │
    ├─> Get OAuth code from Twitch
    │
    └─> mutate({ code })
            │
            ├─> useAuthLogin('twitch', { navigate })
            │
            ├─> authStrategyManager.getLoginStrategy('twitch')
            │
            ├─> TwitchAuthStrategy.getLoginEndpoint() → '/login/social/twitch'
            │
            ├─> TwitchAuthStrategy.formatLoginPayload(code)
            │   → { code }
            │
            ├─> POST /api/auth/login/social/twitch
            │
            ├─> If status 202 (email collision):
            │   └─> TwitchAuthStrategy.getEmailCollisionMessage()
            │       └─> User confirms
            │       └─> POST /api/auth/login/resolve_email_collision
            │
            ├─> Fetch user profile (GET /api/auth/user/me)
            │
            ├─> setUser() in auth store
            │
            └─> navigate('/dashboard')
```

### 2. Integration Flow (Link Account)
```
Component (LinkAccountModal)
    │
    ├─> Get OAuth code
    │
    └─> mutate({ code })
            │
            ├─> useIntegration('twitch', { navigate })
            │
            ├─> authStrategyManager.getIntegrationStrategy('twitch')
            │
            ├─> TwitchAuthStrategy.getIntegrationEndpoint() → '/user/integration'
            │
            ├─> TwitchAuthStrategy.formatIntegrationPayload(code)
            │   → { code: { code }, type: { type: 'twitch' } }
            │
            ├─> POST /api/auth/user/integration
            │
            └─> navigate('/dashboard')
```

## Adding a New Platform

```
1. Create Strategy Class
   └─> src/lib/strategies/YouTubeAuthStrategy.ts
       implements IAuthLoginStrategy

2. Register Strategy
   └─> src/lib/authStrategyRegistry.ts
       registerAuthStrategies() {
         const strategy = new YouTubeAuthStrategy()
         authStrategyManager.registerIntegrationStrategy('youtube', strategy)
         authStrategyManager.registerLoginStrategy('youtube', strategy)
       }

3. Export Strategy
   └─> src/lib/strategies/index.ts
       export { YouTubeAuthStrategy } from './YouTubeAuthStrategy'

4. Use in Components
   └─> useAuthLogin('youtube', { navigate })
       useIntegration('youtube', { navigate })
```

## Key Benefits

✅ **Open/Closed Principle**: Open for extension, closed for modification
✅ **Strategy Pattern**: Each platform is self-contained
✅ **DRY**: No duplicate code for similar platforms
✅ **Extensible**: Add new platforms without modifying existing code
✅ **Testable**: Mock strategies for unit tests
✅ **Maintainable**: Centralized platform logic
✅ **Type-Safe**: Full TypeScript support
✅ **Backward Compatible**: Old hooks still work

## File Structure

```
src/
├── lib/
│   ├── authStrategyManager.ts          (Manager & Interfaces)
│   ├── authStrategyRegistry.ts         (Registration)
│   ├── strategies/
│   │   ├── index.ts                    (Exports)
│   │   ├── TwitchAuthStrategy.ts       (Implementation)
│   │   ├── DaAuthStrategy.ts           (Implementation)
│   │   ├── GitHubAuthStrategy.example.ts (Template)
│   │   ├── STRATEGY_GUIDE.md           (Detailed Guide)
│   │   ├── QUICK_REFERENCE.ts          (Quick Examples)
│   │   └── README.md                   (This file)
│
└── hooks/
    └── useAuth.tsx                     (Generic hooks)
```

## Configuration

### Initialize in App
```typescript
// main.tsx or App.tsx
import { registerAuthStrategies } from '@/lib/authStrategyRegistry'

registerAuthStrategies() // Call once on app start
```

### Use in Components
```typescript
import { useAuthLogin, useIntegration } from '@/hooks/useAuth'

// Login
const { mutate: login } = useAuthLogin('twitch', { navigate })

// Integration
const { mutate: link } = useIntegration('twitch', { navigate })
```
