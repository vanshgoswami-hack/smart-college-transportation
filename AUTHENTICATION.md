# Power Stone authentication

## Using the application

- Open **Student Login / Signup** and choose **Sign up** to create a student account with your email and a password of 8–128 characters.
- Sign in using those credentials. Successful signup also signs you in automatically.
- Sessions are saved in PostgreSQL with an HttpOnly cookie for seven days. Refreshing the page restores the account and assigned stop.
- Use **Sign out** in the header to revoke the current session.
- **Try student demo** and **Try admin demo** open explicitly public sample accounts. They do not require passwords. These buttons use the same server session flow as normal sign-in.
- The sample emails shown elsewhere in the app are demo identities, not campus SSO credentials. Campus SSO is not integrated.

## Staff account provisioning

Set server-side environment variables before starting the app:

- `POWER_STONE_ADMIN_EMAIL`: a staff email, distinct from the reserved sample emails.
- `POWER_STONE_ADMIN_PASSWORD`: a password of 8–128 characters.

An administrator account is created on the first seeded request if the email is not already registered. Existing accounts are never promoted or overwritten through these variables. The default staff ID for this provisioned account is `ADM-STAFF`; the badge field is optional at sign-in.

Do not expose these variables with a `NEXT_PUBLIC_` prefix or commit actual credentials.

## Demo mode and deployment

This is a shared sample transportation environment. Demo administrator access is intentionally available for exploring fleet management. Set `POWER_STONE_DEMO_ACCESS=false` before any deployment containing real student or transportation data. This disables creation and use of demo sessions.

Only students can self-register. Admin APIs require an authenticated administrator. Submitted reports use the session's identity, not a name or ID supplied by the browser. Public transit responses do not include user records or password hashes.

Passwords use salted scrypt hashes. Session tokens use cryptographically random bytes; only their SHA-256 hashes are stored in PostgreSQL. HTTPS cookies are Secure, HttpOnly, SameSite=None and Partitioned to support the embedded preview; local HTTP uses SameSite=Lax. Authenticated mutations reject mismatched request origins. If browser cookie settings prevent persistence, the sign-in form explains how to open the app in its own tab.

The sign-in attempt limit is in-memory per application instance. For a multi-instance production deployment, use a shared rate limiter and a reviewed identity provider with verified-email/password-recovery flows.

## Schema and regression tests

Apply the schema using `npx drizzle-kit push` after the sandbox database has been bootstrapped.

With the production preview running, use `npx playwright test tests/auth.spec.ts --workers=1 --reporter=list`. Set `POWER_STONE_TEST_URL` if the server is not at `http://127.0.0.1:3000`. Install the test browser with `npx playwright install chromium` if needed.

The tests exercise real API and browser flows, including signup, password checks, refresh persistence, logout, expired sessions, role checks, demo access, errors, and mobile sign-in. Temporary non-demo test accounts are deleted afterward using Drizzle.
