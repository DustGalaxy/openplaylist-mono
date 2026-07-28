import { createFileRoute } from '@tanstack/react-router'
import i18n from '@/i18n'
import { RegisterForm } from '@/features/auth'
import { FeatureI18nProvider } from '@/lib/i18n/featureTranslation'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
  meta: () => [
    { title: i18n.t('meta.register.title') },
    { name: 'description', content: i18n.t('meta.register.description') },
  ],
})

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-level-1 px-4">
      <FeatureI18nProvider ns="auth">
        <RegisterForm />
      </FeatureI18nProvider>
    </div>
  )
}
