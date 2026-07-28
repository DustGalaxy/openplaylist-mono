import { createFileRoute } from '@tanstack/react-router'
import i18n from '@/i18n'
import { LoginForm } from '@/features/auth'
import { FeatureI18nProvider } from '@/lib/i18n/featureTranslation'

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
      <FeatureI18nProvider ns="auth">
        <LoginForm />
      </FeatureI18nProvider>
    </div>
  )
}
