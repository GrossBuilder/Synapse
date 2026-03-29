# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Active support  |
| < 1.0   | ❌ Not supported   |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in Synapse, please report it responsibly:

1. **Email:** Send a detailed report to **security@synapse.app**
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to expect

- **Acknowledgment** within 48 hours
- **Assessment** within 7 days
- **Fix timeline** based on severity:
  - 🔴 Critical — within 24 hours
  - 🟠 High — within 72 hours
  - 🟡 Medium — within 2 weeks
  - 🟢 Low — next release

## Security Measures

Synapse implements the following security controls:

- **Authentication:** NextAuth.js with JWT sessions, bcrypt password hashing
- **Authorization:** Role-based access (user/admin), session verification on all protected routes
- **Input Validation:** Server-side validation on all API endpoints
- **Rate Limiting:** Redis-based rate limiting on auth, payment, and matching endpoints
- **Content Security:** Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **WebRTC Security:** JWT-authenticated Socket.IO connections, TURN server with credentials
- **Payment Security:** Server-side transaction verification via TronGrid API
- **XSS Protection:** Input sanitization, URL validation for user-provided content
- **Brute Force Protection:** Progressive lockout on admin login attempts
- **Cron Protection:** Secret-based authentication for scheduled tasks

## Environment Variables

All secrets are stored in environment variables and **never** committed to the repository:

- `.env` files are in `.gitignore`
- `.env.example` contains only templates with no real values
- Production secrets are generated at deploy time by `deploy/deploy.sh`

## Responsible Disclosure

We appreciate the security research community. If you responsibly disclose a vulnerability:

- We will credit you in the release notes (if desired)
- We will not pursue legal action for good-faith security research
- We ask that you give us reasonable time to fix the issue before public disclosure
