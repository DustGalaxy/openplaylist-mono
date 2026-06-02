import { createFileRoute } from '@tanstack/react-router'
import i18n from '@/i18n'
import { LoginForm } from '@/features/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  meta: () => [
    { title: i18n.t('meta.login.title') },
    { name: 'description', content: i18n.t('meta.login.description') },
  ],
})

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-level-1 px-4">
      <LoginForm />
    </div>
  )
}
