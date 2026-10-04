import { formatOrderMoney } from './orders.js'

export const SITE_ORIGIN = 'https://blueeyedclowns.com'

export const INQUIRY_STATUSES = ['new', 'replied', 'closed']

export const INQUIRY_FILTERS = [
  { id: 'new', label: 'New' },
  { id: 'replied', label: 'Replied' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' }
]

export const PAID_ORDER_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

const TYPE_LABELS = {
  contact: 'Contact',
  wholesale: 'Wholesale',
  local_pickup: 'Local pickup',
  product_question: 'Product question'
}

const TYPE_BADGES = {
  contact: 'badge-ghost',
  wholesale: 'badge-info',
  local_pickup: 'badge-warning',
  product_question: 'badge-primary'
}

const INQUIRY_STATUS_LABELS = {
  new: 'New',
  replied: 'Replied',
  closed: 'Closed'
}

const INQUIRY_STATUS_BADGES = {
  new: 'badge-error',
  replied: 'badge-info',
  closed: 'badge-ghost'
}

const SAFE_EMAIL = /^[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+$/

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value) => UUID_RE.test(String(value || ''))

export const inquiryTypeLabel = (type) => TYPE_LABELS[type] || type || 'Message'

export const inquiryTypeBadgeClass = (type) => TYPE_BADGES[type] || 'badge-ghost'

export const inquiryStatusLabel = (status) => INQUIRY_STATUS_LABELS[status] || status || 'Unknown'

export const inquiryStatusBadgeClass = (status) => INQUIRY_STATUS_BADGES[status] || 'badge-ghost'

export const inquiryPreview = (row) => {
  const subject = String(row?.subject || '').trim()
  if (subject) return subject
  const message = String(row?.message || '').replace(/\s+/g, ' ').trim()
  if (!message) return 'No message'
  if (message.length <= 140) return message
  return `${message.slice(0, 137)}…`
}

export const mailtoAddress = (email) => {
  const to = String(email || '').trim()
  if (!SAFE_EMAIL.test(to)) return ''
  return `mailto:${to}`
}

export const mailtoReply = (email, subject) => {
  const to = mailtoAddress(email)
  if (!to) return ''
  const topic = String(subject || '').replace(/\s+/g, ' ').trim() || 'your message'
  return `${to}?subject=${encodeURIComponent(`Re: ${topic}`)}`
}

export const telHref = (phone) => {
  const raw = String(phone || '').trim()
  if (!raw) return ''
  const cleaned = raw.replace(/[^\d+]/g, '')
  const normalized = cleaned.startsWith('+')
    ? `+${cleaned.slice(1).replace(/\+/g, '')}`
    : cleaned.replace(/\+/g, '')
  if (!/\d/.test(normalized)) return ''
  return `tel:${normalized}`
}

const sitePath = (path, slug) => {
  const value = String(slug || '').trim()
  if (!value) return ''
  return `${SITE_ORIGIN}${path}/${encodeURIComponent(value)}`
}

export const productUrl = (slug) => sitePath('/shop', slug)

export const pairUrl = (slug) => sitePath('/bonded-pairs', slug)

export const matchesInquiryFilter = (row, filter) => {
  if (!filter || filter === 'all') return true
  return row?.status === filter
}

export const emptyInquiriesCopy = (filter) => {
  if (filter === 'new') {
    return {
      icon: 'mdi:inbox-outline',
      title: 'No new inquiries',
      description: 'New messages from the website show up here'
    }
  }
  if (filter === 'replied') {
    return {
      icon: 'mdi:reply-outline',
      title: 'No replied inquiries',
      description: 'Inquiries you mark replied show up here'
    }
  }
  if (filter === 'closed') {
    return {
      icon: 'mdi:check-circle-outline',
      title: 'No closed inquiries',
      description: 'Inquiries you close show up here'
    }
  }
  return {
    icon: 'mdi:inbox-outline',
    title: 'No inquiries yet',
    description: 'Contact, wholesale, pickup, and product questions from the website show up here'
  }
}

export const sourceLabel = (source) => {
  const value = String(source || '').trim()
  if (!value || value === 'website') return 'Website'
  return value
}

export const subscriberStatusLabel = (status) => {
  if (status === 'subscribed') return 'Subscribed'
  if (status === 'unsubscribed') return 'Unsubscribed'
  return status || 'Unknown'
}

export const subscriberStatusBadgeClass = (status) =>
  status === 'subscribed' ? 'badge-success' : 'badge-ghost'

export const subscribedEmails = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.status === 'subscribed')
    .map((row) => String(row.email || '').trim())
    .filter((email) => SAFE_EMAIL.test(email))

const csvCell = (value) => {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export const subscribersToCsv = (rows) => {
  const headers = ['email', 'name', 'source', 'status', 'created_at', 'unsubscribed_at']
  const lines = [headers.join(',')]
  for (const row of Array.isArray(rows) ? rows : []) {
    lines.push(headers.map((key) => csvCell(row?.[key])).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}

export const customerLabel = (customer) => {
  const name = String(customer?.name || '').trim()
  if (name) return name
  const email = String(customer?.email || '').trim()
  if (email) return email
  return 'Customer'
}

export const matchesCustomerSearch = (customer, query) => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const name = String(customer?.name || '').toLowerCase()
  const email = String(customer?.email || '').toLowerCase()
  return name.includes(q) || email.includes(q)
}

export const ordersForCustomer = (customer, orders) => {
  const id = customer?.id || ''
  const email = String(customer?.email || '').trim().toLowerCase()
  const seen = new Set()
  const matched = []
  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order?.id || seen.has(order.id)) continue
    const byId = Boolean(id) && order.customer_id === id
    const orderEmail = String(order.customer_email || '').trim().toLowerCase()
    const byEmail = Boolean(email) && orderEmail === email
    if (!byId && !byEmail) continue
    seen.add(order.id)
    matched.push(order)
  }
  return matched
}

export const customerStats = (customer, orders) => {
  const matched = ordersForCustomer(customer, orders)
  const paid = matched.filter((order) => PAID_ORDER_STATUSES.includes(order.status))
  const totalCents = paid.reduce((sum, order) => sum + (Number(order.total_cents) || 0), 0)
  return {
    matched,
    paidCount: paid.length,
    otherCount: matched.length - paid.length,
    totalCents
  }
}

export const customerSpendLabel = (stats) => {
  const count = Number(stats?.paidCount) || 0
  if (!count) return 'No paid orders'
  const orders = count === 1 ? '1 order' : `${count} orders`
  return `${orders} · ${formatOrderMoney(stats.totalCents)}`
}

export const emptyCustomersCopy = (query) => {
  if (String(query || '').trim()) {
    return {
      icon: 'mdi:magnify',
      title: 'No matching customers',
      description: 'Try a different name or email'
    }
  }
  return {
    icon: 'mdi:account-multiple-outline',
    title: 'No customers yet',
    description: 'Shop customers show up here after an order or a saved contact'
  }
}

export const describeCustomerError = (err) => {
  const message = err?.message || 'Could not load customers'
  if (/permission denied/i.test(message)) {
    return 'Customers are not available to the app yet. The admin database grant still needs to be applied.'
  }
  return message
}

export const countPhrase = (count, singular, plural) => {
  const n = Number(count) || 0
  if (n === 1) return `1 ${singular}`
  return `${n} ${plural}`
}
