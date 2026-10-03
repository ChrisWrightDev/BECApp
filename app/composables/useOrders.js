import { withTimeout } from '~/utils/loadState'

const ORDER_LIST_COLUMNS = `
  id,
  customer_name,
  customer_email,
  total_cents,
  status,
  created_at,
  order_items(count)
`

const ORDER_DETAIL_COLUMNS = `
  id,
  stripe_payment_intent_id,
  customer_email,
  customer_name,
  shipping_address_line1,
  shipping_address_line2,
  shipping_city,
  shipping_state,
  shipping_postal_code,
  shipping_country,
  total_cents,
  status,
  tracking_number,
  carrier,
  shipped_at,
  delivered_at,
  admin_notes,
  created_at,
  updated_at,
  order_items (
    id,
    product_name,
    quantity,
    price_cents,
    clownfish_id,
    created_at
  )
`

export const useOrders = () => {
  const supabase = useSupabaseClient()

  const fetchOrders = async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('orders')
        .select(ORDER_LIST_COLUMNS)
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return data || []
  }

  const fetchOrder = async (id) => {
    const { data, error } = await withTimeout(
      supabase
        .from('orders')
        .select(ORDER_DETAIL_COLUMNS)
        .eq('id', id)
        .maybeSingle()
    )
    if (error) throw error
    if (!data) return null
    const items = Array.isArray(data.order_items) ? [...data.order_items] : []
    items.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    return { ...data, order_items: items }
  }

  const fetchActionCount = async () => {
    const { count, error } = await withTimeout(
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['paid', 'processing'])
    )
    if (error) throw error
    return count ?? 0
  }

  const updateOrder = async ({ id, status, carrier, trackingNumber, adminNotes }) => {
    const { data, error } = await withTimeout(
      supabase.rpc('admin_update_order', {
        p_order_id: id,
        p_status: status,
        p_carrier: carrier || null,
        p_tracking_number: trackingNumber || null,
        p_admin_notes: adminNotes || null
      })
    )
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }

  return {
    fetchOrders,
    fetchOrder,
    fetchActionCount,
    updateOrder
  }
}
