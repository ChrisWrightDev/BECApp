export default defineNuxtPlugin(() => {
  const { initTheme, watchSystemTheme } = useTheme()
  initTheme()
  watchSystemTheme()
})
