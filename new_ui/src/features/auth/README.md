# Authentication Components

Complete social-first authentication system with email/password fallback.

## Components

### LoginForm
Dedicated login form component with social login as primary option.

**Features:**
- Social login (Twitch, DeviantArt) as primary tab
- Classic email/password login as secondary option
- Tab-based interface for clean UX
- Error handling with user feedback
- Loading states
- Automatic redirect to dashboard on success

**Usage:**
```tsx
import { LoginForm } from '@/components/auth'

function MyLoginPage() {
  return <LoginForm onSuccess={() => console.log('Logged in!')} />
}
```

**Props:**
- `onSuccess?: () => void` - Callback when authentication succeeds

**Endpoints Used:**
- `POST /login/classic` - Email/password authentication
- `POST /login/social/{type}` - OAuth social login

### RegisterForm
Dedicated registration form component with social signup as primary option.

**Features:**
- Social registration (Twitch, DeviantArt) as primary tab
- Classic email/password registration as secondary option
- Password validation (min 8 characters)
- Confirm password validation
- Tab-based interface
- Error handling
- Automatic redirect to dashboard on success

**Usage:**
```tsx
import { RegisterForm } from '@/components/auth'

function MyRegisterPage() {
  return <RegisterForm onSuccess={() => console.log('Account created!')} />
}
```

**Props:**
- `onSuccess?: () => void` - Callback when account is created

**Endpoints Used:**
- `POST /register` - Email/password registration
- `POST /login/social/{type}` - OAuth social signup

### AuthPage
Combined authentication page with login/register mode switching.

**Features:**
- Toggle between login and register modes
- Both social and classic options in each mode
- Buttons to switch between modes
- Integrated layout

**Usage:**
```tsx
import { AuthPage } from '@/components/auth'

function AuthContainer() {
  return <AuthPage defaultMode="login" />
}
```

**Props:**
- `defaultMode?: 'login' | 'register'` - Which mode to show initially (default: 'login')
- `onSuccess?: () => void` - Callback on authentication success

## Integration with Backend

### Social Authentication Flow

1. User clicks social button (Twitch/DeviantArt)
2. `useOAuthUrl` hook generates OAuth state and redirect URL
3. State stored in localStorage for CSRF protection
4. Redirect to OAuth provider
5. Provider redirects back to `/oauth-callback` with code
6. Backend verifies code and returns JWT token
7. User authenticated and redirected to dashboard

**Backend Handling:**
- Social login: `POST /login/social/{type}` with code parameter
- May return 202 with `NEED_CONFIRMATION` action if email conflict occurs
- On confirmation: `POST /resolve_email_colision` resolves the conflict

### Classic Authentication Flow

**Login:**
1. User enters email and password
2. Form submits to `POST /login/classic`
3. Backend validates credentials
4. Returns 200 with JWT token in httponly cookie
5. User redirected to dashboard

**Register:**
1. User enters username, email, password
2. Form validates password strength (min 8 chars)
3. Submits to `POST /register`
4. Backend creates user and returns JWT token
5. User redirected to dashboard

## UI Components Used

- **Tabs** - For switching between social and classic auth
- **Input** - For email, password, username fields
- **Label** - For field labels
- **Button** (`my-btn`) - For action buttons
- **Icons** - Optional for social buttons (can be added)

## Styling

Components use the design system with:
- Tailwind CSS classes
- CSS variables for colors (background, level-2, level-3, text-secondary, etc.)
- Responsive design with proper spacing
- Dark mode support via theme variables
- Custom button shadows and animations via `my-btn`

## Error Handling

Both forms handle common errors:
- Missing required fields
- Email already registered
- Invalid email format
- Password mismatch
- Weak password
- Network errors
- OAuth provider errors

Errors are displayed in a red banner above the form.

## Loading States

- Buttons show loading text while request is pending
- Buttons are disabled during API calls
- Inputs disabled during request
- Prevents double-submission

## OAuth Configuration

OAuth URLs are generated via `useOAuthUrl` hook which:
- Validates platform support
- Generates CSRF state token
- Stores state for verification
- Builds complete authorization URL
- Redirects to OAuth provider

Supported platforms:
- Twitch
- DeviantArt (DA)

## Example: Full Auth Page Route

See [login.tsx](../routes/login.tsx) and [register.tsx](../routes/register.tsx) for complete route examples.

Can also be used as single combined page:

```tsx
// Combined auth route
import { AuthPage } from '@/components/auth'

export const Route = createFileRoute('/auth')({
  component: () => <AuthPage defaultMode="login" />
})
```

## Security Features

- CSRF protection via OAuth state tokens
- Secure httponly cookies for JWT storage
- Password validation and confirmation
- No passwords logged or displayed
- Secure API calls with credentials

## Customization

### Styling
Modify button colors and spacing in the component className props:

```tsx
className="w-full bg-[#9146FF] hover:bg-[#7c2e9c] text-white"
```

### Additional Platforms
To add more OAuth platforms:
1. Add platform to `oauthConfig.ts`
2. Add button in social tabs:
```tsx
<Btn
  text={`Sign ${mode === 'login' ? 'in' : 'up'} with ${platform}`}
  onClick={() => handleSocialLogin(platform)}
/>
```

### Custom Validation
Add additional validation in `handleClassicLogin` and `handleClassicRegister` methods.
