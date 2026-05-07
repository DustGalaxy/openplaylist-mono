import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTwitchAuthMutation, useTwitchIntegration } from '@/hooks/useAuth'
import { OAUTH_STATE_KEY, REDIRECT_AFTER_LOGIN_KEY } from '@/lib/utils'

export const Route = createFileRoute('/twitch-callback')({
  component: TwitchCallbackPage,
})

function TwitchCallbackPage() {
  const navigate = useNavigate()
  const mutation = useTwitchAuthMutation({ navigate })
  const intergation = useTwitchIntegration({ navigate })

  const hasProcessedUrlRef = useRef(false)
  const authInitiatedRef = useRef(false) // Флаг для отслеживания запуска мутации

  useEffect(() => {
    // Гарантируем, что этот блок кода выполнится только один раз
    if (hasProcessedUrlRef.current) {
      return
    }
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const stateFromUrl = searchParams.get('state')
    let state = stateFromUrl?.split(':')[1]
    let type = stateFromUrl?.split(':')[0]
    if (stateFromUrl?.includes(':') === false) {
      state = stateFromUrl
      type = undefined
    }
    const storedState = localStorage.getItem(OAUTH_STATE_KEY)

    // ПРОВЕРКА STATE (CSRF)
    if (!state || !storedState || state !== storedState) {
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

    if (code) {
      console.log('type:', type)
      if (type === 'integration') {
        if (!authInitiatedRef.current) {
          console.log('Initiating Twitch integration linking...')
          intergation.mutate({ code })

          authInitiatedRef.current = true // Устанавливаем флаг, что мутация запущена
          hasProcessedUrlRef.current = true // Отмечаем, что URL обработан
        }
        return
      }
      if (!authInitiatedRef.current) {
        console.log('Initiating Twitch authentication...')
        mutation.mutate({ code })

        authInitiatedRef.current = true // Устанавливаем флаг, что мутация запущена
        hasProcessedUrlRef.current = true // Отмечаем, что URL обработан
      }
    } else {
      console.error('No Twitch authorization code found in URL.')
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
    }
  }, [])

  return (
    <div className="text-center text-text-main p-[20px]">
      <h1>Авторизация через Twitch...</h1>
      {mutation.isPending && <p>Отправка кода авторизации на сервер...</p>}
      {mutation.isSuccess && (
        <p>
          Код отправлен, ожидаем подтверждения авторизации и загрузки профиля...
        </p>
      )}
      {mutation.isError && (
        <p style={{ color: 'red' }}>
          Произошла ошибка при аутентификации:{' '}
          {mutation.error.message || 'Неизвестная ошибка'}
        </p>
      )}
      {!mutation.isPending && !mutation.isSuccess && !mutation.isError && (
        <p>Инициализация авторизации...</p>
      )}
      <p>Пожалуйста, подождите.</p>
    </div>
  )
}
