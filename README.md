# AuditForecaster

Energy audit management application built with Express, React, and PostgreSQL.

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm
- PostgreSQL (optional for development)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Dirty13itch/AuditForecaster.git
cd AuditForecaster
```

2. Install dependencies
```bash
npm install --ignore-scripts
```

Note: We use `--ignore-scripts` to bypass chromedriver installation which may fail in restricted network environments.

### Running in Development Mode

#### Without Database (Recommended for Quick Testing)
```bash
SKIP_AUTH_VALIDATION=true \
SKIP_AUTH_SETUP=true \
SESSION_SECRET=test-secret-key-that-is-at-least-32-characters-long \
npm run dev
```

This will:
- Start the server on port 5000
- Use in-memory session storage
- Skip Replit authentication
- Server will be accessible at http://localhost:5000

#### With PostgreSQL Database
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/energy_audit_db \
SESSION_SECRET=your-super-secret-session-key-min-32-chars \
npm run dev
```

### Environment Variables

#### Required
- `SESSION_SECRET` - Session encryption key (minimum 32 characters)

#### Optional (Development)
- `DATABASE_URL` - PostgreSQL connection string (uses in-memory store if not set)
- `SKIP_AUTH_VALIDATION` - Set to `true` to bypass authentication validation
- `SKIP_AUTH_SETUP` - Set to `true` to bypass OIDC authentication setup
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (default: development)

#### Replit-Specific (Required in Production)
- `REPL_ID` - Replit application ID
- `REPLIT_DOMAINS` - Comma-separated list of allowed domains
- `ISSUER_URL` - OIDC issuer URL (default: https://replit.com/oidc)

#### Optional Services
- `SENDGRID_API_KEY` - SendGrid API key for email functionality
- `SENTRY_DSN` - Sentry DSN for error tracking
- `VITE_SENTRY_DSN` - Client-side Sentry DSN

See `.env.example` for a complete list of environment variables.

### Building for Production

```bash
npm run build
```

This creates:
- Client build in `dist/public/`
- Server build in `dist/index.js`

### Running Production Build

```bash
npm start
```

Note: Production requires all environment variables to be properly configured.

### Running Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:accessibility

# Performance tests
npm run test:perf
```

## Project Structure

```
.
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared types and schemas
├── db/              # Database seed files
├── migrations/      # Database migrations
├── tests/           # Test files
└── docs/            # Documentation
```

## Known Issues

### TypeScript Errors
The project currently has 2290 TypeScript errors documented in `.ts-error-baseline.json`. These are known technical debt and do not prevent the application from running. The errors are being tracked with a target resolution date.

### Development Mode Limitations
When running without a database:
- User authentication is disabled
- Data is not persisted
- Some features requiring database access will not work

### Network Restrictions
Some dependencies (like chromedriver) may fail to install in restricted network environments. Use `npm install --ignore-scripts` to bypass these issues.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please create an issue on GitHub.
