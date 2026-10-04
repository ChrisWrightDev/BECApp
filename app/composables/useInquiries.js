import { withTimeout } from '~/utils/loadState'

const INQUIRY_COLUMNS = `
  id,
  type,
  name,
  email,
  phone,
  subject,
  message,
  related_product_slug,
  related_pair_slug,
  status,
  admin_notes,
  created_at,
  updated_at
`

export const useInquiries = () => {
  const supabase = useSupabaseClient()
  const newInquiryCount = useState('adminNewInquiryCount', () => 0)

  const fetchInquiries = async () => {
    const { data, error } = await withTimeout(
      supabase
        .from('inquiries')
        .select(INQUIRY_COLUMNS)
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return data || []
  }

  const fetchInquiry = async (id) => {
    const { data, error } = await withTimeout(
      supabase
        .from('inquiries')
        .select(INQUIRY_COLUMNS)
        .eq('id', id)
        .maybeSingle()
    )
    if (error) throw error
    return data
  }

  const fetchNewInquiryCount = async () => {
    const { count, error } = await withTimeout(
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
    )
    if (error) throw error
    newInquiryCount.value = count ?? 0
    return newInquiryCount.value
  }

  const updateInquiry = async (id, patch) => {
    const { data, error } = await withTimeout(
      supabase
        .from('inquiries')
        .update(patch)
        .eq('id', id)
        .select(INQUIRY_COLUMNS)
        .maybeSingle()
    )
    if (error) throw error
    if (!data?.id) throw new Error('Could not update this inquiry')
    if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
      fetchNewInquiryCount().catch(() => {})
    }
    return data
  }

  return {
    fetchInquiries,
    fetchInquiry,
    fetchNewInquiryCount,
    updateInquiry,
    newInquiryCount: readonly(newInquiryCount)
  }
}
