import { withTimeout } from '~/utils/loadState'

const CUSTOMER_COLUMNS = `
  id,
  name,
  email,
  phone,
  source,
  notes,
  created_at,
  updated_at
`

const ORDER_SUMMARY_COLUMNS = `
  id,
  customer_id,
  customer_email,
  customer_name,
  total_cents,
  status,
  created_at
`

export const useCustomers = () => {
  const supabase = useSupabaseClient()

  const fetchCustomers = async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('customers')
        .select(CUSTOMER_COLUMNS)
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return data || []
  }

  const fetchCustomer = async (id) => {
    const { data, error } = await withTimeout(
      supabase
        .from('customers')
        .select(CUSTOMER_COLUMNS)
        .eq('id', id)
        .maybeSingle()
    )
    if (error) throw error
    return data
  }

  const fetchCustomerCount = async () => {
    const { count, error } = await withTimeout(
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
    )
    if (error) throw error
    return count ?? 0
  }

  const fetchOrderSummaries = async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('orders')
        .select(ORDER_SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return data || []
  }

  const updateCustomerNotes = async (id, notes) => {
    const { data, error } = await withTimeout(
      supabase
        .from('customers')
        .update({ notes })
        .eq('id', id)
        .select(CUSTOMER_COLUMNS)
        .maybeSingle()
    )
    if (error) throw error
    if (!data?.id) throw new Error('Could not save notes')
    return data
  }

  return {
    fetchCustomers,
    fetchCustomer,
    fetchCustomerCount,
    fetchOrderSummaries,
    updateCustomerNotes
  }
}
