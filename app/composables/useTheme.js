export const useTheme = () => {
  const isDark = useState('isDarkTheme', () => false)

  const applyTheme = () => {
    if (!import.meta.client) return
    const html = document.documentElement
    if (isDark.value) {
      html.setAttribute('data-theme', 'dark')
      html.classList.add('dark')
    } else {
      html.setAttribute('data-theme', 'light')
      html.classList.remove('dark')
    }
  }

  const initTheme = () => {
    if (!import.meta.client) return
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = savedTheme ? savedTheme === 'dark' : prefersDark
    applyTheme()
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
    if (import.meta.client) {
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    }
  }

  const setTheme = (theme) => {
    isDark.value = theme === 'dark'
    applyTheme()
    if (import.meta.client) {
      localStorage.setItem('theme', theme)
    }
  }

  const watchSystemTheme = () => {
    if (!import.meta.client) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        isDark.value = e.matches
        applyTheme()
      }
    })
  }

  return {
    isDark: readonly(isDark),
    toggleTheme,
    setTheme,
    applyTheme,
    initTheme,
    watchSystemTheme
  }
}
