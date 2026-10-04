import { withTimeout } from '~/utils/loadState'

const SUBSCRIBER_COLUMNS = `
  id,
  email,
  name,
  source,
  status,
  created_at,
  unsubscribed_at
`

export const useSubscribers = () => {
  const supabase = useSupabaseClient()

  const fetchSubscribers = async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('subscribers')
        .select(SUBSCRIBER_COLUMNS)
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return data || []
  }

  const fetchSubscribedCount = async () => {
    const { count, error } = await withTimeout(
      supabase
        .from('subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'subscribed')
    )
    if (error) throw error
    return count ?? 0
  }

  return {
    fetchSubscribers,
    fetchSubscribedCount
  }
}
