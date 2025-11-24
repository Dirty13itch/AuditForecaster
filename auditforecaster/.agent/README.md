# AuditForecaster Agent Configuration

This directory contains configuration, workflows, and standards for the AuditForecaster project.

## 📋 Key Documents

### [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)
**Primary reference for all development work**

Core principles:
- Automation first (use ESLint, Prettier, TypeScript)
- Atomic changes (one logical change at a time)
- Continuous verification (build must pass)
- Type safety (no explicit `any` without justification)

**Read this before making any code changes.**

## 🔄 Workflows

### [/code-quality-check](./workflows/code-quality-check.md)
Automated code quality checks and fixes
- Auto-fix with ESLint
- Verify build
- Type checking

### [/database](./workflows/database.md)
Database management operations
- Backup, restore, migration

## 🎯 Project Standards

All work on this project must follow:
1. **Industry best practices** from Google, Airbnb, Microsoft
2. **Automated tools first** before manual edits
3. **Build verification** after every change
4. **Type safety** throughout the codebase

## 🚀 Quick Start for New Contributors

1. Read [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)
2. Set up pre-commit hooks (coming soon)
3. Run `/code-quality-check` before committing
4. Follow the commit message format

## 📚 Additional Resources

- Next.js 15 Documentation
- Prisma Best Practices
- TypeScript Handbook
- Project README in root directory
