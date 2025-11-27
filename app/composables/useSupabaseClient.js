export const useSupabaseClient = () => {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$supabase
}

