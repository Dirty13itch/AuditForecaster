# Production Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] All environment variables set in production
- [ ] `NEXTAUTH_SECRET` is strong and unique (32+ characters)
- [ ] `DATABASE_URL` points to production database
- [ ] `NEXTAUTH_URL` set to production domain (with HTTPS)
- [ ] Email service configured (RESEND_API_KEY, EMAIL_FROM)

### Database
- [ ] Run `npx prisma migrate deploy` on production database
- [ ] Verify database connection works
- [ ] Set up automated daily backups
- [ ] Configure connection pooling (e.g., Prisma Accelerate or PgBouncer)

### Security
- [ ] SSL/HTTPS enabled (automatic on Vercel)
- [ ] Security headers configured in `next.config.ts`
- [ ] Rate limiting enabled for API endpoints
- [ ] CORS configured correctly
- [ ] Environment variables reviewed for sensitive data

### Code Quality
- [ ] Run `npm run verify` (lint + test + build)
- [ ] All tests passing
- [ ] No console.log() in production code
- [ ] Error tracking configured (Sentry recommended)

### Performance
- [ ] Images optimized (using next/image)
- [ ] Bundle size analyzed (run `npm run build` and check output)
- [ ] Loading states implemented
- [ ] Database queries optimized (no N+1 issues)

## Deployment

### Vercel (Recommended)
- [ ] Project connected to GitHub
- [ ] Environment variables set in Vercel dashboard
- [ ] Production domain configured
- [ ] Deploy preview checked
- [ ] Production deployed

### Alternative Platforms
- [ ] Docker container tested
- [ ] Health check endpoint working
- [ ] Static assets served correctly
- [ ] Database migrations run

## Post-Deployment

### Monitoring
- [ ] Error tracking active (Sentry or similar)
- [ ] Uptime monitoring configured
- [ ] Performance metrics tracking (Vercel Analytics or PostHog)
- [ ] Database query performance monitored

### Testing
- [ ] Smoke test all major features
- [ ] Test authentication flow
- [ ] Verify email delivery
- [ ] Check offline mode works (PWA)
- [ ] Test on mobile devices

### Documentation
- [ ] Update README with production URLs
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Share credentials with team (securely)

## Rollback Plan

### If Issues Arise
- [ ] Know how to revert deployment (Vercel: instant rollback)
- [ ] Database backup location documented
- [ ] Rollback tested in staging
- [ ] Team notified of rollback procedures

## First Week Post-Launch

### Monitoring
- [ ] Check error logs daily
- [ ] Monitor performance metrics
- [ ] Review user feedback
- [ ] Check database performance

### Optimization
- [ ] Analyze slow endpoints
- [ ] Review and optimize database queries
- [ ] Check for memory leaks
- [ ] Validate caching strategy

---

**Date:** _________  
**Deployed by:** _________  
**Production URL:** _________  
**Notes:** _________
