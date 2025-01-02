export default defineNuxtRouteMiddleware(async (event) => {
  if (import.meta.client) return

  const { $verifyJwtToken } = useNuxtApp()

  const jwtCookie = useCookie('userJwtToken')
  if (!jwtCookie.value) {
    return navigateTo('/signup')
  }
  try {
    await $verifyJwtToken(jwtCookie.value, process.env.JWT_SECRET as string)
  } catch(err) {
    return navigateTo('/signup')
  }
})