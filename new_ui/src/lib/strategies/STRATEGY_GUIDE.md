# Auth Strategy Pattern Implementation Guide

## Overview

This implementation uses the **Strategy Pattern** to make authentication and integration flows extensible and maintainable. It follows the Open/Closed Principle - open for extension, closed for modification.

## Architecture

### Core Components

#### 1. `authStrategyManager.ts` - Manager & Interfaces
The central manager that registers and retrieves strategies.

**Interfaces:**
- `IAuthIntegrationStrategy` - For linking existing accounts
- `IAuthLoginStrategy` - For login flow with email collision support

**Manager Class:**
- `AuthStrategyManager` - Registry pattern implementation

```typescript
// Get a strategy
const strategy = authStrategyManager.getLoginStrategy('twitch')

// Get all registered platforms
const { integration, login } = authStrategyManager.getRegisteredPlatforms()
```

#### 2. `authStrategyRegistry.ts` - Registration
Initializes and registers all available strategies. Call this once during app startup.

```typescript
// In your app initialization (e.g., main.tsx)
import { registerAuthStrategies } from '@/lib/authStrategyRegistry'

registerAuthStrategies()
```

#### 3. Concrete Strategies
Located in `src/lib/strategies/`:
- `TwitchAuthStrategy.ts` - Twitch OAuth implementation
- `DaAuthStrategy.ts` - DA (Discord/Alternative) OAuth implementation

### Generic Hooks

#### `useIntegration(platform, { navigate })`
Links an existing social account to the current user's account.

```typescript
// Usage
const { mutate, isPending, error } = useIntegration('twitch', { navigate })
mutate({ code: 'oauth_code_from_provider' })
```

#### `useAuthLogin(platform, { navigate })`
Complete login flow with email collision handling.

```typescript
// Usage
const { mutate, isPending, error } = useAuthLogin('twitch', { navigate })
mutate({ code: 'oauth_code_from_provider' })
```

### Backward Compatibility

Platform-specific hooks are preserved as wrappers:
- `useDaIntegration()` → `useIntegration('da', ...)`
- `useDAAuthMutation()` → `useAuthLogin('da', ...)`
- `useTwitchIntegration()` → `useIntegration('twitch', ...)`
- `useTwitchAuthMutation()` → `useAuthLogin('twitch', ...)`

## Adding a New Platform

### Step 1: Create a Strategy Class

Create `src/lib/strategies/YouTubeAuthStrategy.ts`:

```typescript
import type { IAuthLoginStrategy } from '../authStrategyManager'

export class YouTubeAuthStrategy implements IAuthLoginStrategy {
  private readonly platformName = 'youtube'

  getIntegrationEndpoint(): string {
    return '/user/integration'
  }

  formatIntegrationPayload(code: string): Record<string, unknown> {
    return {
      code: { code },
      type: { type: this.platformName },
    }
  }

  getLoginEndpoint(): string {
    return `/login/social/${this.platformName}`
  }

  formatLoginPayload(code: string): Record<string, unknown> {
    return { code }
  }

  getErrorMessage(context: 'network' | 'auth_failed'): string {
    if (context === 'network') {
      return 'Network Error: Could not connect to backend for YouTube auth.'
    }
    return 'YouTube authentication failed on backend.'
  }

  getEmailCollisionMessage(username: string): string {
    return `Found account with same email as your YouTube account (${username}). Link or create new?`
  }

  getPlatformName(): string {
    return this.platformName
  }

  allowsEmailCollision(): boolean {
    return true
  }
}
```

### Step 2: Register the Strategy

Update `src/lib/authStrategyRegistry.ts`:

```typescript
import { YouTubeAuthStrategy } from './strategies/YouTubeAuthStrategy'

export function registerAuthStrategies(): void {
  // ... existing registrations ...

  const youtubeStrategy = new YouTubeAuthStrategy()
  authStrategyManager.registerIntegrationStrategy('youtube', youtubeStrategy)
  authStrategyManager.registerLoginStrategy('youtube', youtubeStrategy)
}
```

### Step 3: Export the Strategy

Update `src/lib/strategies/index.ts`:

```typescript
export { YouTubeAuthStrategy } from './YouTubeAuthStrategy'
```

### Step 4: Use in Components

```typescript
import { useAuthLogin } from '@/hooks/useAuth'

function YouTubeLoginButton() {
  const { mutate } = useAuthLogin('youtube', { navigate })
  
  return <button onClick={() => mutate({ code })}>Login with YouTube</button>
}
```

## Key Design Principles

### 1. Open/Closed Principle
- **Open for extension**: Add new platforms by creating new strategy classes
- **Closed for modification**: No changes to existing code needed

### 2. Strategy Pattern
Each platform (Twitch, DA, YouTube, etc.) is a self-contained strategy implementing the same interface.

### 3. Registry Pattern
The `AuthStrategyManager` maintains a registry of all available strategies, enabling dynamic strategy selection.

### 4. Dependency Injection
Strategies are registered once during initialization and retrieved as needed.

## Platform-Specific Configuration

### Different Endpoint Paths
Override `getIntegrationEndpoint()` or `getLoginEndpoint()`:

```typescript
getLoginEndpoint(): string {
  return '/auth/custom-endpoint'  // Different path for this platform
}
```

### Custom Payload Format
Override `formatIntegrationPayload()` or `formatLoginPayload()`:

```typescript
formatLoginPayload(code: string): Record<string, unknown> {
  return {
    access_token: code,
    client_id: 'your-client-id'
  }
}
```

### Custom Error Messages
Override `getErrorMessage()`:

```typescript
getErrorMessage(context: 'network' | 'auth_failed'): string {
  return context === 'network' 
    ? 'Custom network error message'
    : 'Custom auth error message'
}
```

### Email Collision Behavior
Override `allowsEmailCollision()`:

```typescript
allowsEmailCollision(): boolean {
  return false  // This platform doesn't allow email collision
}
```

## Testing

When testing, you can create mock strategies:

```typescript
import { authStrategyManager } from '@/lib/authStrategyManager'

class MockAuthStrategy implements IAuthLoginStrategy {
  // ... implement interface methods ...
}

// Register mock for testing
beforeEach(() => {
  const mockStrategy = new MockAuthStrategy()
  authStrategyManager.registerLoginStrategy('test-platform', mockStrategy)
})
```

## Error Handling

Each strategy defines error messages for:
- **network**: Backend connection issues
- **auth_failed**: Authentication failures (invalid code, expired token, etc.)

The generic hooks handle:
- Network errors with appropriate user messages
- Authentication failures with strategy-specific messages
- Email collision resolution (if allowed)
- User profile fetching and updating

## Future Enhancements

1. **Conditional Features**: Check if a platform supports a feature
   ```typescript
   supportsEmailCollision(): boolean
   supportsTeams(): boolean
   ```

2. **Custom Error Handlers**: Allow strategies to define custom error handling logic
   ```typescript
   handleCustomError(error: AxiosError): Error
   ```

3. **Pre/Post Hooks**: Allow strategies to run logic before/after auth
   ```typescript
   onBeforeLogin(code: string): Promise<void>
   onAfterLoginSuccess(user: UserProfile): Promise<void>
   ```

4. **Scopes/Permissions**: Allow strategies to define required permissions
   ```typescript
   getRequiredScopes(): string[]
   ```
