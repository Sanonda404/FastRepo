import { useEffect, useState, useSyncExternalStore } from "react"
import { api, clearAuthToken, getAuthToken, subscribeAuthChange } from "@/lib/apis/api"
import type { UserResponse } from "@/lib/interfaces"

let cachedUsername: string | null = null

function getIsLoggedIn(): boolean {
  return getAuthToken() !== null
}

export function useAuth() {
  const isLoggedIn = useSyncExternalStore(
    subscribeAuthChange,
    getIsLoggedIn,
    getIsLoggedIn
  )
  const [username, setUsername] = useState<string | null>(cachedUsername)

  useEffect(() => {
    if (!isLoggedIn || cachedUsername) return
    let active = true
    api<UserResponse>("/users/me")
      .then((user) => {
        cachedUsername = user.username
        if (active) setUsername(user.username)
      })
      .catch(() => {})
    return () => { active = false }
  }, [isLoggedIn])

  const logout = () => {
    cachedUsername = null
    clearAuthToken()
  }

  return {
    isLoggedIn,
    username: isLoggedIn ? username : null,
    logout,
  }
}
