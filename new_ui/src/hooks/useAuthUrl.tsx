import { useRouterState } from '@tanstack/react-router'
import {
  OAUTH_STATE_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
  generateOAuthState,
  getConfig,
} from '@/lib/utils'

export const useTwitchLoginUrl = () => {
  const routerState = useRouterState()

  const handleTwitchLogin = (isIntegration: boolean = false) => {
    console.log(getConfig())
    const config = getConfig()
    console.log("handleTwitchLogin", isIntegration);
    // 1. Генерируем уникальное состояние для защиты от CSRF-атак
    const state = generateOAuthState()
    localStorage.setItem(OAUTH_STATE_KEY, state)

    // Вычисляем текущий полный путь для последующего редиректа
    const currentPath =
      routerState.location.pathname +
      routerState.location.searchStr +
      routerState.location.hash

    // 2. Сохраняем текущий путь, чтобы вернуться на него после логина
    localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, currentPath)
    // 3. Формируем URL для авторизации Twitch
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${config.TWITCH_CLIENT_ID}&redirect_uri=${config.TWITCH_REDIRECT_URI}&scope=${config.TWITCH_SCOPES}&state=${(isIntegration ? 'integration:' : '') + state}`

    // 4. Перенаправляем пользователя на Twitch

    window.location.href = twitchAuthUrl
  }

  return handleTwitchLogin
}

export const useDaLoginUrl = () => {
  const routerState = useRouterState()

  const handleDaLogin = (isIntegration: boolean = false) => {
    // 1. Генерируем уникальное состояние для защиты от CSRF-атак
    const state = generateOAuthState()
    localStorage.setItem(OAUTH_STATE_KEY, state)
    console.log(getConfig())
    console.log("handleDaLogin", isIntegration);
    
    const config = getConfig()
    // Вычисляем текущий полный путь для последующего редиректа
    const currentPath =
      routerState.location.pathname +
      routerState.location.searchStr +
      routerState.location.hash

    // 2. Сохраняем текущий путь, чтобы вернуться на него после логина
    localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, currentPath)
    // 3. Формируем URL для авторизации DA
    const daAuthUrl = `https://www.donationalerts.com/oauth/authorize?response_type=code&client_id=${config.DA_CLIENT_ID}&redirect_uri=${config.DA_REDIRECT_URI}&scope=${config.DA_SCOPES}&state=${(isIntegration ? 'integration:' : '') + state}`

    // 4. Перенаправляем пользователя на DA

    window.location.href = daAuthUrl
  }

  return handleDaLogin
}
