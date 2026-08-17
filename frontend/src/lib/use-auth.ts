import { useSyncExternalStore } from "react"
import { getAuthToken, clearAuthToken, subscribeAuthChange } from "@/lib/api"
import { mockUser } from "@/lib/mock-data"

export interface AuthState {
  isLoggedIn: boolean
  username: string | null
  logout: () => void
}

function getIsLoggedIn(): boolean {
  return getAuthToken() !== null
}

export function useAuth(): AuthState {
  const isLoggedIn = useSyncExternalStore(
    subscribeAuthChange,
    getIsLoggedIn,
    getIsLoggedIn
  )
  return {
    isLoggedIn,
    username: isLoggedIn ? mockUser.username : null,
    logout: clearAuthToken,
  }
}
