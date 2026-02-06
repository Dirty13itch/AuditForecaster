# Field Inspect

> **Production-ready** SaaS platform for energy audit management

A full-stack Next.js application for managing energy audits, inspections, builders, and reporting with offline-first capabilities.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd auditforecaster

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Initialize database
npx prisma generate
npx prisma db push

# Seed database (optional)
npm run db:seed

# Seed for E2E testing (creates Admin/Inspector users)
npm run db:seed:e2e

# Run development server
npm run dev
```

Visit `http://localhost:3000`

---

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fieldinspect"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"

# Email (Optional - for notifications)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Node Environment
NODE_ENV="development"
```

> **Note**: Environment variables are validated at **build time** using Zod schemas in `src/lib/env.ts`. Missing or invalid values will cause the build to fail with clear error messages.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── actions/            # Server actions (API layer)
│   ├── api/                # API routes
│   └── login/              # Auth pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── ...                 # Feature components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities & configurations
│   ├── env.ts              # Environment validation
│   ├── prisma.ts           # Database client
│   └── email.ts            # Email service
└── types/                  # TypeScript types
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |
| `npm run verify` | Lint + Test + Type check |
| `npm run db:seed` | Seed database with sample data |
| `npx prisma studio` | Open Prisma database GUI |

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **UI**: React + shadcn/ui + Tailwind CSS
- **Auth**: NextAuth.js
- **Validation**: Zod
- **PWA**: next-pwa for offline support

### Key Features
- **Server Actions**: All data mutations use type-safe server actions
- **Input Validation**: Zod schemas validate all inputs before database operations
- **Image Optimization**: Next.js Image component for automatic optimization
- **Error Handling**: Global error boundaries and 404 pages
- **Loading States**: Skeleton screens for all major pages
- **Offline Mode**: PWA with offline sync (V2) including retry logic and Dead Letter Queue (DLQ) for failed mutations
- **Role-Based Access**: Admin, Inspector, Builder roles

---

## 🔒 Security

### Implemented
- ✅ **Authentication**: NextAuth.js with session management
- ✅ **Authorization**: All server actions check `auth()` before execution
- ✅ **Input Validation**: Zod schemas on all server actions
- ✅ **SQL Injection Prevention**: Prisma parameterized queries
- ✅ **XSS Prevention**: React automatic escaping
- ✅ **CSRF Protection**: Built into Next.js server actions

### Recommended (Before Production)
- [ ] Set up rate limiting (e.g., `@upstash/ratelimit`)
- [ ] Enable HTTPS/SSL (automatic on Vercel)
- [ ] Configure security headers in `next.config.ts`
- [ ] Set up Sentry for error tracking

---

## 📊 Database Schema

Key models:
- **User**: Admins, Inspectors, Builders
- **Job**: Inspection assignments
- **Inspection**: Blower door test data & checklists
- **Builder**: Construction companies
- **Subdivision**: Builder developments
- **Equipment**: Company assets
- **Vehicle**: Fleet management
- **Expense/Mileage**: Financial tracking

See `prisma/schema.prisma` for full schema.

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Current test coverage focuses on:
- Server action integration tests
- PDF generation
- ACH50 calculations

**Recommendation**: Expand coverage to 80% for all server actions.

---

## 🚢 Deployment

### Unraid (Recommended)

We have optimized the deployment pipeline for Unraid using Docker Compose.

1.  **Configure Credentials:**
    Ensure you have SSH access to your Unraid server.

2.  **Deploy:**
    Run the deployment script from your Windows machine:
    ```powershell
    npm run deploy:preview
    ```
    This script will:
    *   Build the Docker image locally.
    *   Save it to a `.tar` file.
    *   SCP the image and `docker-compose.prod.yml` to Unraid.
    *   SSH into Unraid to load the image and restart the containers.

3.  **Verify:**
    Visit `http://YOUR_UNRAID_IP:3000` to see the application running.

### Manual Docker Deployment

```bash
# Build image
docker build -t fieldinspect .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXTAUTH_URL="..." \
  -e NEXTAUTH_SECRET="..." \
  fieldinspect
```

---

## 🐛 Troubleshooting

### Build Fails with "Environment validation failed"
→ Check that all required environment variables in `src/lib/env.ts` are set correctly

### "Property 'mileageLog' does not exist on type 'PrismaClient'"
→ Regenerate Prisma client: `npx prisma generate`

### Images not loading
→ Verify images are in `public/uploads/photos/` or configure `remotePatterns` in `next.config.ts` for external URLs

### Offline sync not working
→ Ensure service worker is registered. Check browser DevTools > Application > Service Workers

---

## 📚 Key Workflows

### Creating a New Server Action

1. Create file in `src/app/actions/`
2. Add `'use server'` directive
3. Import `auth` from `@/auth`
4. Define Zod schema for validation
5. Check authentication:
   ```typescript
   const session = await auth()
   if (!session) throw new Error("Unauthorized")
   ```
6. Validate input:
   ```typescript
   const result = MySchema.safeParse(data)
   if (!result.success) return { error: result.error }
   ```
7. Perform database operation
8. Revalidate path if needed

### Adding a New Page

1. Create `page.tsx` in `src/app/(dashboard)/dashboard/`
2. Add `loading.tsx` for loading state
3. Fetch data using Prisma
4. Handle empty states
5. Add to navigation if needed

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

[Your License Here]

---

## 🆘 Support

For questions or issues:
- Open a GitHub issue
- Contact: [your-email@example.com]

---

**Built with ❤️ by [Your Team Name]**
