# Contributing to Synapse

Thank you for your interest in contributing to Synapse! This guide will help you get started.

## Code of Conduct

By participating, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/GrossBuilder/Synapse/issues) first
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS/Node.js version
   - Screenshots (if applicable)

### Suggesting Features

Open an issue with the **Feature Request** label. Describe:
- The problem you're solving
- Your proposed solution
- Alternatives considered

### Pull Requests

1. **Fork** the repository
2. **Create a branch:** `git checkout -b feature/your-feature` or `fix/your-fix`
3. **Make changes** following the code style below
4. **Test** your changes
5. **Commit** with a clear message: `fix: resolve matching timeout issue`
6. **Push** and open a Pull Request

## Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Synapse.git
cd Synapse/synapse-app

# Install
npm install

# Setup environment
cp .env.example .env
# Edit .env with your local database/redis credentials

# Database
npx prisma generate
npx prisma db push

# Run
npm run dev -- -p 3000     # Next.js app
npm run socket              # Socket.IO server (separate terminal)

# Tests
npm test
```

## Code Style

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **React** — functional components, hooks only
- **Naming:** camelCase for variables/functions, PascalCase for components/types
- **Imports:** absolute paths via `@/` alias (e.g., `@/lib/prisma`)
- **CSS:** Tailwind CSS utility classes, no external CSS files
- **i18n:** All user-facing text must use translation keys (5 locales: en, ru, es, zh, ar)
- **API routes:** Validate all inputs, use proper HTTP status codes, include rate limiting

## Project Architecture

| Directory | Purpose |
|-----------|---------|
| `src/app/[locale]/` | User-facing pages |
| `src/app/admin/` | Admin panel pages |
| `src/app/api/` | API routes |
| `src/components/` | Reusable React components |
| `src/hooks/` | Custom React hooks |
| `src/lib/` | Business logic, utilities |
| `src/i18n/` | Internationalization config |
| `server/` | Socket.IO server |
| `prisma/` | Database schema |
| `messages/` | i18n translation files |
| `deploy/` | Deployment configs |
| `__tests__/` | Unit tests (Vitest) |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add group room screen sharing
fix: resolve WebRTC reconnection on mobile Safari
docs: update deployment guide
refactor: simplify trust score calculation
test: add rate limiting edge case tests
chore: update dependencies
```

## Testing

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- regions         # Run specific test file
```

## Security

- **Never** commit secrets, API keys, or credentials
- Use `process.env.*` for all sensitive values
- Validate all user inputs on the server side
- See [SECURITY.md](SECURITY.md) for vulnerability reporting

## Questions?

Open a [Discussion](https://github.com/GrossBuilder/Synapse/discussions) or reach out via issues.

---

Thank you for helping make Synapse better! 🧠
