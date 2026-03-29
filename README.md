<p align="center">
  <img src="public/icons/icon-192x192.png" width="80" alt="Synapse Logo" />
</p>

<h1 align="center">Synapse</h1>

<p align="center">
  <strong>Secure, anonymous video chat platform with reputation system</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## About

Synapse is an open-source video chat platform that matches strangers for anonymous conversations with a **Safety First** approach. Unlike other random video chat services, Synapse uses a **Trust Score** and **Shadow Pool** system to keep toxic users away from the community — the more you contribute positively, the better your experience.

## Features

- **WebRTC Video Chat** — peer-to-peer video calls with TURN/STUN fallback for NAT traversal
- **Trust Score System** — reputation-based matching with shadow pools for repeat offenders
- **AI Text Moderation** — real-time content filtering across 8 categories and 5 languages using pattern matching + optional OpenAI
- **Subscription Plans** — Free, Plus ($4.99/mo), Pro ($9.99/mo) with crypto (USDT TRC-20) and card (LemonSqueezy) payments
- **Admin Panel** — full dashboard with user management, reports, analytics, payments, settings, and guide
- **Internationalization** — 5 languages (EN, RU, ES, ZH, AR) with 9 regional matching pools
- **Group Rooms** — multi-user video rooms with WebRTC mesh
- **Progressive Web App** — installable PWA with push notifications
- **Category Matching** — match by interests (Gaming, Music, Languages, etc.)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Auth | NextAuth.js (Google OAuth, GitHub OAuth) |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis 7 (rate limiting, Socket.IO adapter) |
| Realtime | Socket.IO + WebRTC |
| TURN Server | coturn |
| Payments | USDT TRC-20 (TronGrid), LemonSqueezy (cards) |
| Monitoring | Sentry |
| Deploy | Docker Compose, Nginx, Let's Encrypt |

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+
- **Redis** 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/GrossBuilder/Synapse.git
cd Synapse/synapse-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values (see .env.example for descriptions)

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Start development server
npm run dev -- -p 3000

# In a separate terminal — start Socket.IO server
npm run socket
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your app URL |
| `ADMIN_EMAIL` | ✅ | Admin panel login email |
| `ADMIN_PASSWORD` | ✅ | Admin panel login password |
| `USDT_WALLET_ADDRESS` | 💰 | USDT TRC-20 receiving wallet |
| `TRONGRID_API_KEY` | 💰 | TronGrid API key (increases rate limits) |
| `OPENAI_API_KEY` | 🤖 | For AI text moderation (optional) |

## Project Structure

```
synapse-app/
├── prisma/              # Database schema
├── server/              # Socket.IO server (WebRTC signaling)
├── deploy/              # Deployment configs (nginx, coturn, deploy script)
├── messages/            # i18n translations (en, ru, es, zh, ar)
├── public/              # Static assets, PWA manifest, icons
├── __tests__/           # Vitest unit tests
└── src/
    ├── app/
    │   ├── [locale]/    # User-facing pages (lobby, chat, profile, etc.)
    │   ├── admin/       # Admin panel (dashboard, users, reports, etc.)
    │   └── api/         # API routes (auth, payments, profile, etc.)
    ├── components/      # React components
    ├── hooks/           # Custom hooks (useWebRTC, useSocket, useMatching)
    ├── i18n/            # next-intl routing & config
    ├── lib/             # Business logic (auth, payments, trust-score, etc.)
    └── types/           # TypeScript types
```

## Deployment

### Quick Deploy (Automated)

The included script deploys everything on a fresh Ubuntu 22.04+ VPS:

```bash
# Upload project to your server
scp -r . user@server:/opt/synapse/

# SSH into server and run
ssh root@server
cd /opt/synapse
nano deploy/deploy.sh    # Set DOMAIN and EMAIL
chmod +x deploy/deploy.sh
./deploy.sh
```

The script automatically installs Docker, configures Nginx with SSL, generates all secrets, and starts 5 containers.

### Manual Deploy

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for step-by-step instructions.

### Docker Compose

```bash
# Set passwords in environment
export DB_PASSWORD=$(openssl rand -hex 16)
export REDIS_PASSWORD=$(openssl rand -hex 16)

# Build and start
docker compose build
docker compose up -d

# Apply database schema
docker compose exec app npx prisma db push
```

## Admin Panel

Access at `/admin/login`. Features:

- **Dashboard** — real-time activity stats, user growth chart
- **Users** — search, ban/warn, subscription management
- **Reports** — automated progressive punishments, AI severity analysis
- **Analytics** — revenue, sessions, regions, category popularity
- **Payments** — transaction audit trail, revenue dashboard
- **Settings** — feature flags, matching rules, AI moderation config
- **Trust Score** — reputation system with shadow pool monitoring

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

**Do NOT open a public issue for security vulnerabilities.**

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) — see the LICENSE file for details.

This means:
- ✅ Free to use, modify, and distribute
- ✅ Commercial use allowed
- ⚠️ Modified versions must be open-sourced under the same license
- ⚠️ Network use (SaaS) requires source code disclosure

---

<p align="center">
  Built with ❤️ by <strong>AetheriaArchitect</strong> — for a safer internet
</p>
