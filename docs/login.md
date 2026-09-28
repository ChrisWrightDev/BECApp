# Login & Persistent Sessions

## Overview

The BEC Aquaculture app uses persistent sessions to allow users to stay signed in for up to a year, making it behave like an installed application rather than a traditional web page.

## User Experience

### Login Page Features

- **Email and Password Authentication**: Standard Supabase email/password auth
- **Keep Me Signed In**: Checkbox (enabled by default) that controls session persistence
  - When checked: Session stored in `localStorage` for long-term persistence
  - When unchecked: Session stored in `sessionStorage` for current browser session only
- **Show/Hide Password Toggle**: Eye icon button to reveal password
- **Password Reset Flow**: "Forgot password?" link sends a Supabase password reset email
- **Mobile-First Design**: Optimized for phone screens with proper autocomplete attributes
- **Password Manager Support**: Uses proper `autocomplete` attributes (`email`, `current-password`)

### Session Behavior

- **Persistent Sessions**: When "Keep me signed in" is checked, users stay logged in across browser restarts
- **Session-Only Mode**: When unchecked, session expires when browser/tab closes
- **Auto-Refresh**: Access tokens automatically refresh in the background
- **Focus Restoration**: Session refreshes when app regains focus or becomes visible
- **Cold Start Support**: Auth middleware waits for session restoration before redirecting

## Technical Implementation

### Client Configuration

The Supabase client is configured in `/app/plugins/supabase.client.js` with:

```javascript
{
  auth: {
    persistSession: true,        // Enable session persistence
    autoRefreshToken: true,      // Auto-refresh access tokens
    detectSessionInUrl: true,    // Handle OAuth callbacks
    flowType: 'pkce',           // Secure OAuth flow
    storage: localStorage or sessionStorage  // Based on user preference
  }
}
```

### Session Storage

- **localStorage**: Used when "Keep me signed in" is checked (default)
- **sessionStorage**: Used when checkbox is unchecked
- Storage preference is stored in `localStorage.getItem('supabase.auth.storage')`

### Session Refresh

The app refreshes sessions in two scenarios:

1. **Automatic Token Refresh**: Supabase SDK handles this via `autoRefreshToken: true`
2. **Visibility Change**: When the app gains focus or becomes visible:
   ```javascript
   document.addEventListener('visibilitychange', handleVisibilityChange)
   window.addEventListener('focus', handleVisibilityChange)
   ```

### Auth Middleware

The auth middleware (`/app/middleware/auth.js`) ensures:

- Session restoration completes before redirecting
- Valid refresh tokens are honored on cold starts
- Proper redirect handling with `?redirect=` query param
- No bouncing between pages during initialization

## Supabase Dashboard Settings

**IMPORTANT**: The following Supabase project settings must be configured correctly for persistent sessions to work:

### Required Settings (Auth → Settings)

1. **Session Settings** (Pro Plan Only)
   - **Time-box user sessions**: MUST be **DISABLED** or set to maximum value
   - **Inactivity timeout**: MUST be **DISABLED** or set to maximum value
   
   > **Note**: These settings are only available on Supabase Pro plan and above. On the Free plan, sessions do not expire by default, which is the desired behavior.

2. **Email Settings**
   - Enable email provider
   - Configure password reset email template (optional customization)
   - Set Site URL to your production domain
   - Add redirect URLs:
     - `http://localhost:3000/auth/update-password` (development)
     - `https://your-domain.com/auth/update-password` (production)

3. **Password Requirements**
   - Minimum password length: 6 characters (or your preferred length)

### What NOT to Change

- **DO NOT** enable session time-boxing unless you want sessions to expire
- **DO NOT** set an inactivity timeout (keep it disabled)
- **DO NOT** revoke refresh tokens (let users stay signed in)
- **DO NOT** enable "Automatically log out users after X days" (if such option exists)

### Verification

To verify your settings are correct:

1. Log in to the Supabase Dashboard
2. Navigate to Authentication → Settings
3. Look for "Session Settings" or "JWT Settings"
4. Confirm that:
   - No session time limits are set
   - No inactivity timeouts are configured
   - Refresh tokens have a long expiration (default is typically 1 year)

## Security Considerations

### Refresh Token Security

- Refresh tokens are stored securely in browser storage (localStorage/sessionStorage)
- Tokens use PKCE (Proof Key for Code Exchange) flow for added security
- Access tokens are short-lived and automatically refreshed
- Session revocation is available via Supabase Dashboard if needed

### Best Practices

1. **User Education**: Users should understand the security implications of "Keep me signed in"
2. **Public Devices**: Users should uncheck "Keep me signed in" on shared/public devices
3. **Session Management**: Admins can revoke user sessions from Supabase Dashboard
4. **Security Monitoring**: Monitor auth logs in Supabase for suspicious activity

## Password Reset Flow

### User Flow

1. Click "Forgot password?" on login page
2. Enter email address
3. Receive password reset email from Supabase
4. Click link in email (redirects to `/auth/update-password`)
5. Enter and confirm new password
6. Automatically redirected to login page
7. Sign in with new password

### Email Configuration

Password reset emails are sent by Supabase using the configured email provider. To customize:

1. Go to Authentication → Email Templates in Supabase Dashboard
2. Edit the "Reset Password" template
3. Ensure redirect URL is set correctly: `{{ .SiteURL }}/auth/update-password`

## Troubleshooting

### Sessions Not Persisting

- **Check Storage**: Verify localStorage is not being cleared by browser settings
- **Check Supabase Settings**: Ensure session time-boxing is disabled
- **Check Browser**: Some browsers (like private/incognito mode) don't persist localStorage
- **Check Network**: Sessions require working internet for token refresh

### Password Reset Not Working

- **Check Email Provider**: Verify Supabase email provider is configured
- **Check Redirect URLs**: Ensure `/auth/update-password` is in allowed redirect URLs
- **Check Spam Folder**: Reset emails may be filtered
- **Check Site URL**: Supabase Site URL must match your domain

### Session Expired on Cold Start

- **Check Token Refresh**: Ensure `autoRefreshToken: true` in Supabase config
- **Check Middleware**: Verify auth middleware waits for session restoration
- **Check Storage**: Ensure refresh token is present in storage

## Development vs Production

### Development

- Uses `http://localhost:3000` as base URL
- Password reset redirects to `http://localhost:3000/auth/update-password`
- Can test with test email addresses

### Production

- Configure production domain as Supabase Site URL
- Add production URLs to redirect whitelist
- Use real email provider for password resets
- Consider rate limiting for login attempts

## Future Enhancements

- Biometric authentication (fingerprint, Face ID)
- Remember last logged-in email
- Multi-factor authentication (MFA)
- "Remember this device" option for enhanced security
- Session activity log for users
