import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useLogoutMutation } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/logout')({
  component: RouteComponent,
})

function RouteComponent() {
  const {
    mutate: logout,
    isSuccess,
    isPending,
    isError,
    error,
  } = useLogoutMutation()
  const { clearAuth } = useAuthStore()

  const navigate = useNavigate()

  useEffect(() => {
    // Инициируем мутацию выхода из системы сразу при монтировании компонента
    // Убедимся, что это происходит только один раз
    if (!isPending && !isSuccess && !isError) {
      logout()
    }
  }, [logout, isPending, isSuccess, isError]) // Зависимости для useEffect

  // Дополнительный useEffect для обработки результата мутации
  // (хотя useLogoutMutation уже содержит логику редиректа)
  useEffect(() => {
    if (isSuccess) {
      console.log('Successfully logged out!')
      // Redirection is handled by useLogoutMutation's internal useEffect
      navigate({ to: '/' })
    } else if (isError) {
      console.error('Logout failed:', error)
      // Если произошла ошибка выхода, но мы все равно хотим очистить состояние клиента
      // (например, если бэкенд недоступен, но пользователь хочет выйти из сессии на клиенте)
      clearAuth()
    }
  }, [isSuccess, isError, error, clearAuth])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
      }}
    >
      <h1>Выход из системы...</h1>
      {isPending && <p>Пожалуйста, подождите, идет выход...</p>}
      {isError && (
        <p style={{ color: 'red' }}>
          Произошла ошибка при выходе: {error.message || 'Неизвестная ошибка.'}
          <br />
          (Возможно, сервер недоступен. Ваша локальная сессия будет очищена.)
        </p>
      )}
      {isSuccess && <p>Вы успешно вышли. Перенаправление...</p>}
    </div>
  )
}
