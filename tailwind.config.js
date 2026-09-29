/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue'
  ],
  theme: {
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        bec: {
          primary: '#0284c7',
          'primary-content': '#f8fafc',
          secondary: '#ea580c',
          'secondary-content': '#fff7ed',
          accent: '#0891b2',
          'accent-content': '#ecfeff',
          neutral: '#0f172a',
          'neutral-content': '#e2e8f0',
          'base-100': '#ffffff',
          'base-200': '#f1f5f9',
          'base-300': '#e2e8f0',
          'base-content': '#0f172a',
          info: '#38bdf8',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      'dark'
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    prefix: '',
    logs: false,
    themeRoot: ':root'
  }
}
