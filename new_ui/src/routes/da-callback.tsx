import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useDAAuthMutation, useDaIntegration } from '@/hooks/useAuth'
import { OAUTH_STATE_KEY, REDIRECT_AFTER_LOGIN_KEY } from '@/lib/utils'

export const Route = createFileRoute('/da-callback')({
  component: DACallbackPage,
})

function DACallbackPage() {
  const navigate = useNavigate()
  const mutation = useDAAuthMutation({ navigate })
  const intergation = useDaIntegration({ navigate })

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
          console.log('Initiating Da integration linking...')
          intergation.mutate({ code })

          authInitiatedRef.current = true // Устанавливаем флаг, что мутация запущена
          hasProcessedUrlRef.current = true // Отмечаем, что URL обработан
        }
        return
      } else if (!authInitiatedRef.current) {
        console.log('Initiating DA authentication...')
        mutation.mutate({ code })

        authInitiatedRef.current = true // Устанавливаем флаг, что мутация запущена
        hasProcessedUrlRef.current = true // Отмечаем, что URL обработан
      }
    } else {
      console.error('No Da authorization code found in URL.')
      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
      navigate({ to: '/' })
      hasProcessedUrlRef.current = true
    }
  }, [])

  return (
    <div className="text-center text-white p-[20px]">
      <h1>Авторизация через Donation Alerts...</h1>
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
