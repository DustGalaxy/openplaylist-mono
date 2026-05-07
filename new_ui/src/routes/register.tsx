import { createFileRoute } from '@tanstack/react-router'
import { RegisterForm } from '@/features/auth'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
  meta: () => [
    { title: 'Sign Up - OpenPlaylist' },
    { name: 'description', content: 'Create a new OpenPlaylist account' },
  ],
})

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-level-1 px-4">
      <RegisterForm />
    </div>
  )
}
