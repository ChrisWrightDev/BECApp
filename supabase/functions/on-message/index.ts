// Edge function: on-message
// Receives notification from pg_net trigger, loads the message,
// and forwards it to the ops agent webhook with HMAC signature.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ON_MESSAGE_INTERNAL_SECRET = Deno.env.get('ON_MESSAGE_INTERNAL_SECRET')
const OPS_AGENT_WEBHOOK_URL = Deno.env.get('OPS_AGENT_WEBHOOK_URL')
const OPS_WEBHOOK_SECRET = Deno.env.get('OPS_WEBHOOK_SECRET')
const OPS_AGENT_WEBHOOK_KEY = Deno.env.get('OPS_AGENT_WEBHOOK_KEY')
const OPS_AGENT_WEBHOOK_KEY_HEADER = Deno.env.get('OPS_AGENT_WEBHOOK_KEY_HEADER') || 'Authorization'
const OPS_AGENT_WEBHOOK_KEY_PREFIX_RAW = Deno.env.get('OPS_AGENT_WEBHOOK_KEY_PREFIX')
// Default prefix is 'Bearer ' (with trailing space), unless explicitly set (even to empty string)
const OPS_AGENT_WEBHOOK_KEY_PREFIX = OPS_AGENT_WEBHOOK_KEY_PREFIX_RAW !== undefined
  ? OPS_AGENT_WEBHOOK_KEY_PREFIX_RAW
  : 'Bearer '

serve(async (req) => {
  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Verify internal secret with constant-time compare
    const authHeader = req.headers.get('X-BEC-Internal-Secret')
    if (!ON_MESSAGE_INTERNAL_SECRET || !authHeader) {
      console.error('Missing internal secret')
      return new Response('Unauthorized', { status: 401 })
    }

    // Constant-time comparison
    if (!timingSafeEqual(authHeader, ON_MESSAGE_INTERNAL_SECRET)) {
      console.error('Invalid internal secret')
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse request body
    const { message_id } = await req.json()
    if (!message_id) {
      return new Response('Missing message_id', { status: 400 })
    }

    // Create Supabase service role client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Load the message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', message_id)
      .single()

    if (fetchError || !message) {
      console.error('Failed to load message:', fetchError)
      return new Response('Message not found', { status: 404 })
    }

    // Ignore if sender isn't mike/chris or status isn't pending (idempotency)
    if (!['mike', 'chris'].includes(message.sender_role) || message.agent_status !== 'pending') {
      console.log(`Ignoring message ${message_id}: sender_role=${message.sender_role}, agent_status=${message.agent_status}`)
      return new Response('OK', { status: 200 })
    }

    // Update status to 'processing' with conditional check
    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({ agent_status: 'processing' })
      .eq('id', message_id)
      .eq('agent_status', 'pending')
      .select()
      .single()

    if (updateError || !updated) {
      // Another process already updated it (race condition)
      console.log(`Message ${message_id} already processed by another instance`)
      return new Response('OK', { status: 200 })
    }

    // Check if webhook URL is configured
    if (!OPS_AGENT_WEBHOOK_URL) {
      console.error('OPS_AGENT_WEBHOOK_URL not configured')
      await supabase
        .from('messages')
        .update({ agent_status: 'error' })
        .eq('id', message_id)
      return new Response('Webhook URL not configured', { status: 500 })
    }

    // Build payload
    const payload = {
      message_id: message.id,
      thread: message.thread,
      sender_role: message.sender_role,
      sender_id: message.sender_id,
      body: message.body,
      attachments: message.attachments,
      created_at: message.created_at
    }
    const rawBody = JSON.stringify(payload)

    // Generate timestamp and HMAC signature
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BEC-Timestamp': timestamp
    }

    // OPS_WEBHOOK_SECRET is required - fail if not set
    if (!OPS_WEBHOOK_SECRET) {
      console.error('OPS_WEBHOOK_SECRET not configured; refusing to send unsigned request')
      await supabase
        .from('messages')
        .update({ agent_status: 'error' })
        .eq('id', message_id)
      return new Response('OPS_WEBHOOK_SECRET not configured', { status: 500 })
    }

    // Generate HMAC signature
    const signaturePayload = `${timestamp}.${rawBody}`
    const signature = await hmacSHA256(signaturePayload, OPS_WEBHOOK_SECRET)
    headers['X-BEC-Signature'] = signature

    // Add configurable sender key header if OPS_AGENT_WEBHOOK_KEY is set
    if (OPS_AGENT_WEBHOOK_KEY) {
      headers[OPS_AGENT_WEBHOOK_KEY_HEADER] = `${OPS_AGENT_WEBHOOK_KEY_PREFIX}${OPS_AGENT_WEBHOOK_KEY}`
    }

    // Forward to ops agent webhook with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(OPS_AGENT_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${await response.text()}`)
      }

      // On 2xx, leave status as 'processing'; agent will mark it 'replied'
      console.log(`Successfully forwarded message ${message_id} to ops agent`)
      return new Response('OK', { status: 200 })

    } catch (err) {
      clearTimeout(timeoutId)
      console.error(`Failed to forward message ${message_id} to ops agent:`, err)

      // Set status to 'error'
      await supabase
        .from('messages')
        .update({ agent_status: 'error' })
        .eq('id', message_id)

      return new Response('Failed to forward to ops agent', { status: 500 })
    }

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response('Internal server error', { status: 500 })
  }
})

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = new TextEncoder().encode(a)
  const bBuffer = new TextEncoder().encode(b)
  
  if (aBuffer.length !== bBuffer.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < aBuffer.length; i++) {
    result |= aBuffer[i] ^ bBuffer[i]
  }
  return result === 0
}

// HMAC-SHA256 signature generation
async function hmacSHA256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
