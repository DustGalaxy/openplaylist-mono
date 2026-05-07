import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  meta: () => [
    { title: 'Login - OpenPlaylist' },
    { name: 'description', content: 'Log in to your OpenPlaylist account' },
  ],
})

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-level-1 px-4">
      <LoginForm />
    </div>
  )
}
