// Chat configuration: map user emails to sender roles
// IMPORTANT: Keep this mapping in sync with the RLS policy in:
// supabase/migrations/20260928170100_phase1_messaging.sql
// (search for "case lower(auth.jwt()->>'email')")

export const EMAIL_TO_SENDER_ROLE = {
  'chrismwright@yahoo.com': 'chris',
  'oceanviews@cox.net': 'mike'
}

/**
 * Get sender role for a given email (case-insensitive)
 * @param {string} email - User's email address
 * @returns {string|null} - Sender role ('mike' or 'chris') or null if not found
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
