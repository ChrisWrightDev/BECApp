# Phase 1: Messaging System

## Overview

Phase 1 implements a messaging system that allows Mike and Chris to communicate with an ops agent through a chat interface. Messages are stored in Supabase, forwarded to an external ops agent webhook, and agent responses flow back through the same system with realtime updates.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BECApp Chat UI                               │
│  (Mike/Chris send messages via authenticated Supabase client)       │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ INSERT into messages table
              │ (with sender_role, sender_id, body)
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Supabase messages table                            │
│  • Row inserted with agent_status='pending' (BEFORE INSERT trigger) │
│  • AFTER INSERT trigger fires for mike/chris messages               │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ Trigger calls messages_notify_agent_fn()
              │ (reads Vault secrets, calls pg_net)
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         pg_net extension                             │
│  HTTP POST to on-message edge function                              │
│  Headers: X-BEC-Internal-Secret                                     │
│  Body: { message_id }                                               │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ Fire-and-forget async call
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│             on-message Edge Function (Deno)                          │
│  1. Verify internal secret                                          │
│  2. Load message from DB (service role)                             │
│  3. Update agent_status='processing' (conditional)                  │
│  4. Forward to ops agent webhook with HMAC signature                │
│     and configurable sender key header                              │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ POST with HMAC + sender key
              │ Headers:
              │  - Content-Type: application/json
              │  - X-BEC-Timestamp: <unix seconds>
              │  - X-BEC-Signature: <hex HMAC-SHA256>
              │  - Authorization: Bearer <key> (or custom header/prefix)
              │ Body: { message_id, thread, sender_role, sender_id, body, attachments, created_at }
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              External Ops Agent Webhook                              │
│  • Verifies HMAC signature and sender key                           │
│  • Processes message and generates response                         │
│  • Replies by:                                                      │
│    1. INSERT { thread: 'ops', sender_role: 'agent',                │
│       body: <response>, reply_to: <original id> }                  │
│    2. UPDATE original message:                                      │
│       agent_status='replied', agent_processed_at=now()             │
│  • On error, UPDATE agent_status='error'                           │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ INSERT agent reply + UPDATE original
              │ (using service role key)
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Supabase Realtime (messages table)                      │
│  • Publishes INSERT (new agent message)                             │
│  • Publishes UPDATE (agent_status, read_at changes)                 │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ WebSocket broadcast
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BECApp Chat UI (realtime)                         │
│  • Receives agent reply and appends to message list                 │
│  • Updates original message status                                  │
│  • Auto-marks agent messages as read when page is visible           │
└─────────────────────────────────────────────────────────────────────┘
```

## Ops Agent Reply Contract

The external ops agent **MUST** have service role access to Supabase to reply. When it processes a message, it should:

### Success Path

1. **Insert reply message**:
   ```javascript
   await supabase
     .from('messages')
     .insert({
       thread: 'ops',
       sender_role: 'agent',
       body: '<response text>',
       reply_to: '<original message_id>'
     })
   ```

2. **Update original message**:
   ```javascript
   await supabase
     .from('messages')
     .update({
       agent_status: 'replied',
       agent_processed_at: new Date().toISOString()
     })
     .eq('id', '<original message_id>')
   ```

### Error Path

If the agent encounters an error, it should:

1. **Update original message to error state**:
   ```javascript
   await supabase
     .from('messages')
     .update({ agent_status: 'error' })
     .eq('id', '<original message_id>')
   ```

2. **Optionally post an error message**:
   ```javascript
   await supabase
     .from('messages')
     .insert({
       thread: 'ops',
       sender_role: 'system',
       body: 'Error processing your message: <error details>',
       reply_to: '<original message_id>'
     })
   ```

## Outgoing Webhook Contract

### Request Format

**URL**: Configured via `OPS_AGENT_WEBHOOK_URL` environment variable

**Method**: POST

**Headers**:
- `Content-Type: application/json`
- `X-BEC-Timestamp: <unix_seconds>` — Current Unix timestamp in seconds
- `X-BEC-Signature: <hex_hmac_sha256>` — HMAC-SHA256 signature (see below)
- `<OPS_AGENT_WEBHOOK_KEY_HEADER>: <OPS_AGENT_WEBHOOK_KEY_PREFIX><OPS_AGENT_WEBHOOK_KEY>` — Configurable sender key (see below)

**Body** (JSON):
```json
{
  "message_id": "uuid",
  "thread": "ops",
  "sender_role": "mike" | "chris",
  "sender_id": "uuid",
  "body": "message text",
  "attachments": [],
  "created_at": "ISO 8601 timestamp"
}
```

### HMAC Signature Verification

The `X-BEC-Signature` header contains a hex-encoded HMAC-SHA256 signature of:

```
<timestamp>.<rawBody>
```

Where:
- `<timestamp>` is the value from `X-BEC-Timestamp`
- `<rawBody>` is the raw JSON body (stringified, no extra whitespace)

The signature is keyed with the `OPS_WEBHOOK_SECRET` environment variable.

**IMPORTANT**: `OPS_WEBHOOK_SECRET` is **required**. If it is not set, the edge function will refuse to send unsigned requests, set the message `agent_status='error'`, log the error, and return 500.

**Verification example (Node.js)**:
```javascript
const crypto = require('crypto')

function verifySignature(timestamp, rawBody, signature, secret) {
  const payload = `${timestamp}.${rawBody}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// In your webhook handler:
const timestamp = req.headers['x-bec-timestamp']
const signature = req.headers['x-bec-signature']
const rawBody = JSON.stringify(req.body)

if (!verifySignature(timestamp, rawBody, signature, OPS_WEBHOOK_SECRET)) {
  return res.status(401).json({ error: 'Invalid signature' })
}

// Check replay window (optional but recommended)
const now = Math.floor(Date.now() / 1000)
const age = now - parseInt(timestamp, 10)
if (age > 300) { // 5 minutes
  return res.status(401).json({ error: 'Request too old' })
}
```

**Verification example (Python)**:
```python
import hmac
import hashlib
import time

def verify_signature(timestamp: str, raw_body: str, signature: str, secret: str) -> bool:
    payload = f"{timestamp}.{raw_body}"
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)

# In your webhook handler:
timestamp = request.headers.get('X-BEC-Timestamp')
signature = request.headers.get('X-BEC-Signature')
raw_body = request.get_data(as_text=True)

if not verify_signature(timestamp, raw_body, signature, OPS_WEBHOOK_SECRET):
    return {'error': 'Invalid signature'}, 401

# Check replay window
now = int(time.time())
age = now - int(timestamp)
if age > 300:  # 5 minutes
    return {'error': 'Request too old'}, 401
```

### Configurable Sender Key Header

In addition to HMAC verification, the edge function can send a configurable authentication key via a header. This is controlled by three environment variables:

1. **`OPS_AGENT_WEBHOOK_KEY`**: The key value. If unset or empty, no sender key header is sent.
2. **`OPS_AGENT_WEBHOOK_KEY_HEADER`**: The header name (default: `Authorization`)
3. **`OPS_AGENT_WEBHOOK_KEY_PREFIX`**: The prefix before the key (default: `Bearer ` with trailing space)

**Examples**:

1. **Default (Bearer token)**:
   ```
   OPS_AGENT_WEBHOOK_KEY=my_secret_token
   # Uses defaults: OPS_AGENT_WEBHOOK_KEY_HEADER=Authorization, OPS_AGENT_WEBHOOK_KEY_PREFIX="Bearer "
   # Result: Authorization: Bearer my_secret_token
   ```

2. **Custom header with no prefix** (e.g., API key):
   ```
   OPS_AGENT_WEBHOOK_KEY=my_api_key
   OPS_AGENT_WEBHOOK_KEY_HEADER=X-API-Key
   OPS_AGENT_WEBHOOK_KEY_PREFIX=
   # Result: X-API-Key: my_api_key
   ```

3. **Custom header with custom prefix**:
   ```
   OPS_AGENT_WEBHOOK_KEY=my_token
   OPS_AGENT_WEBHOOK_KEY_HEADER=X-Auth-Token
   OPS_AGENT_WEBHOOK_KEY_PREFIX="Token "
   # Result: X-Auth-Token: Token my_token
   ```

**Important**: The HMAC signature headers (`X-BEC-Timestamp` and `X-BEC-Signature`) are **always** sent, regardless of the sender key configuration. The sender key header is optional and complementary.

### Response

- **2xx**: Success. The edge function leaves `agent_status='processing'`. The agent must mark it `'replied'`.
- **Non-2xx, timeout, or error**: The edge function sets `agent_status='error'`.

## Backstop Polling

Since pg_net is fire-and-forget, messages may not always trigger the webhook (e.g., if pg_net is down or the edge function fails silently). The ops agent should poll periodically (~1 minute) for:

```sql
SELECT * FROM messages
WHERE agent_status IN ('pending', 'processing')
  AND created_at < now() - interval '2 minutes'
ORDER BY created_at ASC
LIMIT 10;
```

For each found message, process it directly and mark as `replied` or `error`.

## Manual Setup Steps

**IMPORTANT**: These steps must be performed manually by Chris. Do NOT apply migrations or deploy functions automatically.

### 1. Review and Apply Migration

```bash
# Review the migration file
cat supabase/migrations/20260928170100_phase1_messaging.sql

# Apply the migration (via Supabase Dashboard or CLI)
# Dashboard: Database > Migrations > New migration (paste SQL)
# OR CLI:
supabase db push
```

**Note**: The post-deployment hardening migration `20260928181500_harden_grants.sql` has already been applied to production. It revokes execute privileges on `messages_set_agent_status_fn()` from public/anon/authenticated roles to prevent unauthorized execution (trigger functions do not require these privileges).

### 2. Enable pg_net Extension

```sql
-- Run in SQL editor (Dashboard > SQL Editor > New query)
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Or via Dashboard: Database > Extensions > Enable `pg_net`.

### 3. Deploy the Edge Function

```bash
cd supabase
supabase functions deploy on-message --no-verify-jwt
```

The `--no-verify-jwt` flag is required because pg_net calls it with a shared secret, not a JWT.

### 4. Create Vault Secrets

The trigger function reads two secrets from Vault:

```sql
-- Run in SQL editor
SELECT vault.create_secret(
  'https://janwtypmneybfzeiauzt.supabase.co/functions/v1/on-message',
  'on_message_url'
);

SELECT vault.create_secret(
  '<random_secret>',
  'on_message_internal_secret'
);
```

Replace `<random_secret>` with a strong random string (e.g., `openssl rand -hex 32`).

### 5. Set Edge Function Secrets

```bash
supabase secrets set \
  ON_MESSAGE_INTERNAL_SECRET=<same_random_secret_from_step_4> \
  OPS_AGENT_WEBHOOK_URL=<your_ops_agent_webhook_url> \
  OPS_WEBHOOK_SECRET=<strong_random_secret_for_hmac> \
  OPS_AGENT_WEBHOOK_KEY=<optional_api_key>

# Optional: customize header and prefix
supabase secrets set \
  OPS_AGENT_WEBHOOK_KEY_HEADER=X-API-Key \
  OPS_AGENT_WEBHOOK_KEY_PREFIX=
```

**Examples**:

- **Bearer token** (default):
  ```bash
  supabase secrets set OPS_AGENT_WEBHOOK_KEY=my_secret_token
  # No need to set HEADER or PREFIX if using defaults
  ```

- **X-API-Key with no prefix**:
  ```bash
  supabase secrets set \
    OPS_AGENT_WEBHOOK_KEY=my_api_key \
    OPS_AGENT_WEBHOOK_KEY_HEADER=X-API-Key \
    OPS_AGENT_WEBHOOK_KEY_PREFIX=
  ```

- **Custom prefix**:
  ```bash
  supabase secrets set \
    OPS_AGENT_WEBHOOK_KEY=my_token \
    OPS_AGENT_WEBHOOK_KEY_HEADER=X-Auth-Token \
    OPS_AGENT_WEBHOOK_KEY_PREFIX="Token "
  ```

**Note**: The `OPS_WEBHOOK_SECRET` is used for HMAC signature generation. Keep it secret and share it with the ops agent webhook for verification.

### 6. Confirm Realtime is Enabled

1. Go to Dashboard > Database > Replication
2. Ensure the `supabase_realtime` publication includes the `messages` table
3. If not, run:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
   ```

## Test Plan

### RLS Checklist

- [ ] **Anon denied**: Anonymous users cannot read, insert, update, or delete messages
- [ ] **Insert restrictions**:
  - [ ] Authenticated users can only insert with `sender_id = auth.uid()`
  - [ ] Authenticated users can only insert with `sender_role` in `('mike', 'chris')`
  - [ ] Authenticated users cannot forge `agent_status`, `read_at`, `agent_processed_at`, or `created_at`
- [ ] **Update restrictions**:
  - [ ] Authenticated users can only update `read_at` column
  - [ ] No delete allowed for any user
- [ ] **Service role bypasses RLS**: The ops agent can insert as `'agent'` or `'system'` and update all columns

### Trigger and Webhook Tests

- [ ] **Message insert without pg_net**: Insert still succeeds (trigger logs warning, no error)
- [ ] **Webhook signature verification**:
  - [ ] Valid signature passes verification
  - [ ] Invalid signature is rejected (401)
  - [ ] Replay attack (old timestamp) is rejected
- [ ] **Sender key header verification**:
  - [ ] Default Bearer token format works
  - [ ] Custom header (e.g., `X-API-Key`) works with empty prefix
  - [ ] Custom prefix works
  - [ ] Omitting key (unset) works (no header sent)
- [ ] **Agent reply**:
  - [ ] Agent reply message appears in realtime
  - [ ] Original message `agent_status` updates to `'replied'`
  - [ ] `agent_processed_at` timestamp is set
- [ ] **Error path**:
  - [ ] Webhook timeout/failure sets `agent_status='error'`
  - [ ] Error message from agent/system appears in chat
- [ ] **Read receipts**:
  - [ ] Agent messages get `read_at` set when page is visible
  - [ ] `read_at` is not set when page is hidden

### Sender Role Enforcement

**Server-side validation**: `sender_role` is strictly enforced via RLS policies:
- The insert policy checks `sender_id = auth.uid()`
- The insert policy checks `sender_role in ('mike','chris')`
- **The insert policy validates sender_role against the user's email**:
  ```sql
  sender_role = case lower(auth.jwt()->>'email')
    when 'chrismwright@yahoo.com' then 'chris'
    when 'oceanviews@cox.net' then 'mike'
    else null
  end
  ```
- The column grant excludes `agent_status`, `read_at`, `agent_processed_at`, and `created_at` to prevent forgery

**Email-to-role mapping**: The mapping exists in **two places** and must be kept in sync:

1. **Migration** (`supabase/migrations/20260928170100_phase1_messaging.sql`):
   - RLS policy WITH CHECK clause (server-side validation)

2. **UI Config** (`app/utils/chatConfig.js`):
   - `EMAIL_TO_SENDER_ROLE` object (client-side UI)

**Current mappings**:
- `chrismwright@yahoo.com` → `chris`
- `oceanviews@cox.net` → `mike`
- Other users can view messages but cannot send (UI disabled, RLS blocks attempts)

**IMPORTANT**: When adding or changing user mappings, update **both** the migration and `chatConfig.js`.

## Rollback

### SQL Rollback

The migration file includes commented-out rollback SQL at the bottom. To roll back:

```sql
BEGIN;

DROP TRIGGER IF EXISTS messages_notify_agent ON public.messages;
DROP TRIGGER IF EXISTS messages_set_agent_status ON public.messages;
DROP FUNCTION IF EXISTS public.messages_notify_agent_fn();
DROP FUNCTION IF EXISTS public.messages_set_agent_status_fn();

-- Remove table from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.messages CASCADE;

COMMIT;
```

### Remove Edge Function

```bash
supabase functions delete on-message
```

### Remove Vault Secrets

```sql
SELECT vault.delete_secret('on_message_url');
SELECT vault.delete_secret('on_message_internal_secret');
```

### Remove Function Secrets

```bash
supabase secrets unset ON_MESSAGE_INTERNAL_SECRET \
  OPS_AGENT_WEBHOOK_URL \
  OPS_WEBHOOK_SECRET \
  OPS_AGENT_WEBHOOK_KEY \
  OPS_AGENT_WEBHOOK_KEY_HEADER \
  OPS_AGENT_WEBHOOK_KEY_PREFIX
```

## Future Enhancements (NOT in Phase 1)

- **Attachments**: Upload and display file attachments
- **Push notifications**: Notify users of new messages via browser notifications or PWA
- **Multi-threading**: Support multiple conversation threads beyond `'ops'`
- **Message editing/deletion**: Allow users to edit or delete their messages
- **Rich text**: Support markdown or rich text formatting
- **Typing indicators**: Show when someone is typing
- **Server-side sender_role validation**: Add email-to-role mapping check in the insert policy

## Notes

- **No hardcoded secrets**: All secrets are in environment variables or Vault
- **No existing tables touched**: This migration only creates new objects
- **Build passes**: `npm run build` succeeds with no errors
- **No attachments UI**: The `attachments` column exists but no UI is built for uploading files
- **Chat is default landing page**: Users are redirected to `/chat` after login
