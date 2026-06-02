import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthLogin, useIntegration } from '@/hooks/useAuth'
import {
  OAUTH_STATE_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
} from '@/lib/utils'
import { deserializeOAuthState } from '@/hooks/useAuthUrl'

export const Route = createFileRoute('/oauth-callback')({
  component: UnifiedOAuthCallbackPage,
})

function UnifiedOAuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasProcessedUrlRef = useRef(false)

  const stateRef = useRef<{
    platform: string | null
    operationType: 'login' | 'integration' | null
  }>({ platform: null, operationType: null })

  const [platform, detectedOperationType] = (() => {
    const params = new URLSearchParams(window.location.search)
    const stateFromUrl = params.get('state')
    const oauthState = deserializeOAuthState(stateFromUrl || '')
    return [oauthState?.platform || null, oauthState?.operationType || null]
  })()

  const loginMutation = useAuthLogin(platform || 'unknown', { navigate })
  const integrationMutation = useIntegration(platform || 'unknown', {
    navigate,
  })

  const mutation =
    detectedOperationType === 'integration' ? integrationMutation : loginMutation

  useEffect(() => {
    if (hasProcessedUrlRef.current) {
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const stateFromUrl = searchParams.get('state')

    if (error) {
      console.error('OAuth provider error:', error)
      alert(t('auth.oauthCallback.authFailed'))
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    const oauthState = deserializeOAuthState(stateFromUrl || '')

    if (!oauthState) {
      console.error('Invalid or missing OAuth state parameter')
      alert(t('auth.oauthCallback.authFailed'))
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    const { platform: statePlatform, operationType: stateOperationType } = oauthState
    const storedState = localStorage.getItem(OAUTH_STATE_KEY)

    if (!stateFromUrl || !storedState || stateFromUrl !== storedState) {
      console.error(
        'CSRF Attack detected or invalid state parameter. Aborting authentication.',
      )
      alert(t('auth.oauthCallback.authFailed'))
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    if (!code) {
      console.error(`No authorization code found in URL for platform: ${statePlatform}`)
      alert(t('auth.oauthCallback.authFailed'))
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
      return
    }

    stateRef.current = {
      platform: statePlatform,
      operationType: stateOperationType,
    }

    mutation.mutate({ code })
    hasProcessedUrlRef.current = true
  }, [mutation, navigate, t])

  const platformName = stateRef.current.platform || 'OAuth Provider'
  const operationType = stateRef.current.operationType || 'authentication'
  const isLinking = operationType === 'integration'

  return (
    <div className="text-center text-text-main p-[20px]">
      <h1>
        {platformName.charAt(0).toUpperCase() + platformName.slice(1)}{' '}
        {isLinking ? t('auth.oauthCallback.linking') : t('auth.oauthCallback.authorizing')}
      </h1>

      {mutation.isPending && <p>{t('auth.oauthCallback.sendingCode')}</p>}

      {mutation.isSuccess && <p>{t('auth.oauthCallback.codeSent')}</p>}

      {mutation.isError && (
        <div>
          <p style={{ color: 'red' }}>{t('auth.oauthCallback.error')}</p>
          <p style={{ color: 'red' }}>
            {mutation.error?.message || t('auth.oauthCallback.unknownError')}
          </p>
        </div>
      )}

      {!mutation.isPending && !mutation.isSuccess && !mutation.isError && (
        <p>{t('auth.oauthCallback.initializing')}</p>
      )}

      <p>{t('auth.oauthCallback.pleaseWait')}</p>
    </div>
  )
}
