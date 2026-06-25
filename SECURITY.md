# Security

What's implemented and what you must do at deploy time.

## Implemented

| Area | Control |
|------|---------|
| JWT | `PyJWT` (replaced unmaintained `python-jose`); `algorithms` pinned to HS256, `exp`+`sub` required at decode. |
| Sessions | httpOnly + Secure + SameSite=strict session cookie; `token_version` revocation; short expiry. |
| CSRF | Double-submit token: readable `mrm_csrf` cookie issued at login, echoed in `X-CSRF-Token`; server requires a match on every cookie-authenticated state-changing request. |
| Login | bcrypt; generic errors; DB-backed lockout; IP rate limit; constant-time dummy-hash on unknown email (no user enumeration). |
| Forced rotation | Bootstrap admin and admin-reset accounts must change password before any other route is reachable (`must_change_password`). |
| Rate limiting | Real client IP behind nginx (rightmost `X-Forwarded-For`); per-route limits on upload/export/standardize/commit; optional Redis store. |
| Input bounds | `max_length` caps on every request-body list/dict (edits, remap, filters, columns, resolutions, mapping). |
| Audit log | `audit_events` records login success/failure/lockout, logout, password change/reset, user create/update, master exports. Admin reads via `GET /api/users/audit`. |
| Headers | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, COOP, HSTS on API and nginx. |
| Host | `TrustedHostMiddleware` (set `TRUSTED_HOSTS`). |
| Network | Backend is not published to the host — only nginx reaches it (compose `expose`). |
| CI | `pip-audit`, `npm audit`, `gitleaks` workflow + Dependabot. |

## Required at deploy time

1. **TLS** — mount `frontend/nginx.prod.conf` over the dev config, provide certs, publish `80`+`443`. It forces HTTP→HTTPS. Keep `COOKIE_SECURE=true`.
2. **Secrets** — set a strong `SECRET_KEY` and `ADMIN_PASSWORD` (startup aborts on placeholders/short values). Change the bootstrap admin password on first login (now enforced).
3. **`TRUSTED_HOSTS`** — set to your real hostname(s); leaving `*` disables the host check.
4. **`CORS_ORIGINS`** — set to your real origin(s).
5. **`REDIS_URL`** — set if you run more than one worker/replica, so rate limits hold globally.

## Still recommended (not yet implemented)

- MFA/TOTP for admin accounts.
- A WAF / network rate limiting in front of nginx.
- Centralized log shipping + alerting on the audit events.
