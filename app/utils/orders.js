export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
]

export const ORDER_CARRIERS = ['USPS', 'UPS', 'FedEx', 'Other']

export const ORDER_FILTERS = [
  { id: 'action', label: 'Needs action' },
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'closed', label: 'Cancelled/Refunded' }
]

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
}

const STATUS_BADGES = {
  pending: 'badge-ghost',
  paid: 'badge-info',
  processing: 'badge-warning',
  shipped: 'badge-primary',
  delivered: 'badge-success',
  cancelled: 'badge-error',
  refunded: 'badge-error'
}

const CHICAGO = 'America/Chicago'

export const orderNumber = (id) => String(id || '').slice(0, 8).toUpperCase()

export const orderStatusLabel = (status) => STATUS_LABELS[status] || status || 'Unknown'

export const orderStatusBadgeClass = (status) => STATUS_BADGES[status] || 'badge-ghost'

export const formatOrderMoney = (cents) => {
  const value = Number(cents)
  const amount = Number.isFinite(value) ? value / 100 : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const chicagoDate = (value, options) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', { timeZone: CHICAGO, ...options })
}

export const formatOrderDate = (value) =>
  chicagoDate(value, { month: 'short', day: 'numeric', year: 'numeric' })

export const formatOrderDateTime = (value) =>
  chicagoDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

export const orderItemCount = (order) => {
  const items = order?.order_items
  if (!Array.isArray(items) || items.length === 0) return 0
  if (items.length === 1 && items[0] && typeof items[0].count === 'number') {
    return items[0].count
  }
  return items.length
}

export const orderItemCountLabel = (count) => {
  const n = Number(count) || 0
  return n === 1 ? '1 item' : `${n} items`
}

export const matchesOrderFilter = (order, filter) => {
  const status = order?.status
  if (filter === 'all') return true
  if (filter === 'action') return status === 'paid' || status === 'processing'
  if (filter === 'pending') return status === 'pending'
  if (filter === 'shipped') return status === 'shipped'
  if (filter === 'delivered') return status === 'delivered'
  if (filter === 'closed') return status === 'cancelled' || status === 'refunded'
  return true
}

export const matchesOrderSearch = (order, query) => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const id = String(order?.id || '').toLowerCase()
  const shortId = orderNumber(order?.id).toLowerCase()
  const name = String(order?.customer_name || '').toLowerCase()
  const email = String(order?.customer_email || '').toLowerCase()
  return name.includes(q) || email.includes(q) || id.includes(q) || shortId.includes(q)
}

export const orderCustomerLabel = (order) => {
  const name = String(order?.customer_name || '').trim()
  if (name) return name
  const email = String(order?.customer_email || '').trim()
  if (email) return email
  return 'Customer'
}

export const formatShippingAddress = (order) => {
  if (!order) return ''
  const lines = []
  const line1 = String(order.shipping_address_line1 || '').trim()
  const line2 = String(order.shipping_address_line2 || '').trim()
  if (line1) lines.push(line1)
  if (line2) lines.push(line2)
  const city = String(order.shipping_city || '').trim()
  const state = String(order.shipping_state || '').trim()
  const postal = String(order.shipping_postal_code || '').trim()
  const cityLine = [city, state].filter(Boolean).join(', ')
  const cityPostal = [cityLine, postal].filter(Boolean).join(' ')
  if (cityPostal) lines.push(cityPostal)
  const country = String(order.shipping_country || '').trim()
  if (country) lines.push(country)
  return lines.join('\n')
}

export const lineTotalCents = (item) => {
  const qty = Number(item?.quantity) || 0
  const price = Number(item?.price_cents) || 0
  return qty * price
}

export const orderSubtotalCents = (items) =>
  (Array.isArray(items) ? items : []).reduce((sum, item) => sum + lineTotalCents(item), 0)

export const trackingUrl = (carrier, trackingNumber) => {
  const raw = String(trackingNumber || '').trim()
  if (!raw || !carrier) return ''
  const n = encodeURIComponent(raw)
  if (carrier === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`
  if (carrier === 'UPS') return `https://www.ups.com/track?tracknum=${n}`
  if (carrier === 'FedEx') return `https://www.fedex.com/fedextrack/?trknbr=${n}`
  return ''
}

export const stripePaymentUrl = (paymentIntentId) => {
  const id = String(paymentIntentId || '').trim()
  if (!id) return ''
  return `https://dashboard.stripe.com/payments/${encodeURIComponent(id)}`
}

export const emptyOrdersCopy = (filter, query) => {
  if (String(query || '').trim()) {
    return {
      icon: 'mdi:magnify',
      title: 'No matching orders',
      description: 'Try a different name, email, or order ID'
    }
  }
  if (filter === 'action') {
    return {
      icon: 'mdi:check-circle-outline',
      title: 'No orders need action',
      description: 'Paid and processing orders show up here'
    }
  }
  if (filter === 'pending') {
    return {
      icon: 'mdi:clock-outline',
      title: 'No pending checkouts',
      description: 'Unpaid checkouts show up here'
    }
  }
  if (filter === 'shipped') {
    return {
      icon: 'mdi:truck-outline',
      title: 'No shipped orders',
      description: 'Orders marked shipped show up here'
    }
  }
  if (filter === 'delivered') {
    return {
      icon: 'mdi:package-variant-closed',
      title: 'No delivered orders',
      description: 'Orders marked delivered show up here'
    }
  }
  if (filter === 'closed') {
    return {
      icon: 'mdi:close-circle-outline',
      title: 'No cancelled or refunded orders',
      description: 'Closed orders show up here'
    }
  }
  return {
    icon: 'mdi:receipt-text-outline',
    title: 'No orders yet',
    description: 'Shop orders will appear here after checkout'
  }
}
