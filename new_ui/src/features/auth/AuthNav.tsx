import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import Btn from '@/components/ui/my-btn'

export function AuthNav() {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm font-medium">{user.username}</span>
        </div>

        <Link to="/settings">
          <Btn className="px-4">Settings</Btn>
        </Link>

        <Link to="/logout">
          <Btn className="px-4">Logout</Btn>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link to="/login">
        <Btn className="px-4">Login</Btn>
      </Link>

      <Link to="/register">
        <Btn className="px-4">Sign Up</Btn>
      </Link>
    </div>
  )
}
