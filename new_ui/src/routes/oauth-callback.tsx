import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useAuthLogin, useIntegration } from '@/hooks/useAuth'
import {
  OAUTH_STATE_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
} from '@/lib/utils'
import { deserializeOAuthState } from '@/hooks/useAuthUrl'

export const Route = createFileRoute('/oauth-callback')({
  component: UnifiedOAuthCallbackPage,
})

/**
 * Unified OAuth callback handler for all social platforms (Twitch, DA, etc.)
 * This page:
 * 1. Extracts the OAuth code from URL
 * 2. Validates CSRF state
 * 3. Detects the platform and operation type from state
 * 4. Routes to appropriate auth hook (login or integration)
 * 5. Handles errors and displays status
 */
function UnifiedOAuthCallbackPage() {
  const navigate = useNavigate()
  const hasProcessedUrlRef = useRef(false)

  // State to track current operation
  const stateRef = useRef<{
    platform: string | null
    operationType: 'login' | 'integration' | null
  }>({ platform: null, operationType: null })

  // Get the appropriate mutation based on operation type
  // We use conditional hooks to avoid issues, but store the platform first
  const [platform, operationType] = (() => {
    const params = new URLSearchParams(window.location.search)
    const stateFromUrl = params.get('state')
    const oauthState = deserializeOAuthState(stateFromUrl || '')
    return [oauthState?.platform || null, oauthState?.operationType || null]
  })()

  // Get mutations based on detected operation type
  const loginMutation = useAuthLogin(platform || 'unknown', { navigate })
  const integrationMutation = useIntegration(platform || 'unknown', {
    navigate,
  })

  // Choose the right mutation based on operation type
  const mutation = operationType === 'integration' ? integrationMutation : loginMutation

  useEffect(() => {
    // Ensure this runs only once
    if (hasProcessedUrlRef.current) {
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const stateFromUrl = searchParams.get('state')

    // 1. Check for OAuth provider errors
    if (error) {
      console.error('OAuth provider error:', error, errorDescription)
      alert(
        `Authentication failed: ${error}\n${errorDescription || 'Please try again.'}`,
      )
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    // 2. Deserialize and validate state
    const oauthState = deserializeOAuthState(stateFromUrl || '')

    if (!oauthState) {
      console.error('Invalid or missing OAuth state parameter')
      alert('Authentication failed: Invalid state parameter. Please try again.')
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    const { platform: statePlatform, operationType: stateOperationType } = oauthState
    const storedState = localStorage.getItem(OAUTH_STATE_KEY)

    // 3. CSRF Protection: Validate state matches stored state
    if (!stateFromUrl || !storedState || stateFromUrl !== storedState) {
      console.error(
        'CSRF Attack detected or invalid state parameter. Aborting authentication.',
      )
      alert('Authentication failed due to security reasons. Please try again.')
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    // 4. Check for authorization code
    if (!code) {
      console.error(`No authorization code found in URL for platform: ${statePlatform}`)
      alert('Authentication failed: No authorization code received. Please try again.')
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    // 5. Store platform and operation type for display
    stateRef.current = {
      platform: statePlatform,
      operationType: stateOperationType,
    }

    // 6. Initiate the appropriate mutation
    console.log(
      `Initiating ${stateOperationType} for ${statePlatform}...`,
    )
    mutation.mutate({ code })
    hasProcessedUrlRef.current = true
  }, [mutation])

  const platformName = stateRef.current.platform || 'OAuth Provider'
  const operationType = stateRef.current.operationType || 'authentication'
  const displayOperationType =
    operationType === 'integration' ? 'account linking' : 'authentication'

  return (
    <div className="text-center text-text-main p-[20px]">
      <h1>
        {platformName.charAt(0).toUpperCase() + platformName.slice(1)}{' '}
        {displayOperationType === 'account linking' ? 'Account Linking' : 'Authorization'}
      </h1>

      {mutation.isPending && (
        <p>Отправка кода авторизации на сервер...</p>
      )}

      {mutation.isSuccess && (
        <p>
          Код отправлен, ожидаем подтверждения авторизации и загрузки
          профиля...
        </p>
      )}

      {mutation.isError && (
        <div>
          <p style={{ color: 'red' }}>
            Произошла ошибка при {displayOperationType}:
          </p>
          <p style={{ color: 'red' }}>
            {mutation.error?.message || 'Неизвестная ошибка'}
          </p>
        </div>
      )}

      {!mutation.isPending &&
        !mutation.isSuccess &&
        !mutation.isError && (
          <p>Инициализация {displayOperationType}...</p>
        )}

      <p>Пожалуйста, подождите.</p>
    </div>
  )
}
