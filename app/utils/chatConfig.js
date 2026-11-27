// Chat configuration: map user emails to sender roles
// IMPORTANT: Keep this mapping in sync with the RLS insert policy.
// The live policy is recreated in:
// supabase/migrations/20261127170000_layne_ops_chat_sender.sql
// (search for "case lower(auth.jwt()->>'email')")

export const EMAIL_TO_SENDER_ROLE = {
  'chrismwright@yahoo.com': 'chris',
  'oceanviews@cox.net': 'mike',
  'laynewright010@gmail.com': 'layne'
}

/**
 * Get sender role for a given email (case-insensitive)
 * @param {string} email - User's email address
 * @returns {string|null} - Sender role ('mike', 'chris', or 'layne') or null if not found
 */
export function getSenderRole(email) {
  if (!email) return null
  const normalizedEmail = email.toLowerCase()
  return EMAIL_TO_SENDER_ROLE[normalizedEmail] || null
}

/**
 * Get display name for a sender role
 * @param {string} role - Sender role
 * @returns {string} - Display name
 */
export function getSenderDisplayName(role) {
  const displayNames = {
    mike: 'Mike',
    chris: 'Chris',
    layne: 'Layne',
    agent: 'Agent',
    system: 'System'
  }
  return displayNames[role] || role
}

/**
 * Check if a user can send messages
 * @param {string} email - User's email address
 * @returns {boolean} - True if user can send messages
 */
export function canSendMessages(email) {
  return getSenderRole(email) !== null
}
