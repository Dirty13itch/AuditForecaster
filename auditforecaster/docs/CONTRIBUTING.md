# Contributing Guidelines

## Welcome!

Thank you for contributing to Field Inspect! This document provides guidelines for contributing to the project.

---

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Git

### Getting Started

```bash
# Clone repository
git clone [repository-url]
cd auditforecaster

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

### 2. Make Changes

Follow our [Code Standards](./CODE_STANDARDS.md).

**Key Points:**
- Write TypeScript with strict mode
- Add tests for new features
- Update documentation
- Use structured logging
- Validate inputs with Zod

### 3. Commit Changes

We use [Conventional Commits](https://www.conventionalcommits.org/).

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Testing
- `chore`: Maintenance

**Examples:**
```bash
git commit -m "feat(builders): add builder export functionality"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "docs(api): update API documentation"
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create a Pull Request on GitHub with:
- Clear description of changes
- Link to related issues
- Screenshots (if UI changes)
- Test results

---

## Code Review Process

### PR Requirements

- [ ] Code follows [Code Standards](./CODE_STANDARDS.md)
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Type-safe (TypeScript strict mode)
- [ ] Security considerations reviewed
- [ ] Performance impact considered

### Review Checklist

**Functionality:**
- Does it work as intended?
- Are edge cases handled?
- Is error handling appropriate?

**Code Quality:**
- Is the code readable and maintainable?
- Are functions/components properly sized?
- Is there unnecessary complexity?

**Security:**
- Are inputs validated?
- Is authentication/authorization checked?
- Are secrets handled properly?

**Performance:**
- Are database queries optimized?
- Is caching used appropriately?
- Are unnecessary re-renders avoided?

**Testing:**
- Are tests comprehensive?
- Do tests cover edge cases?
- Are tests maintainable?

---

## Testing Requirements

### Unit Tests

Required for:
- All server actions
- Utility functions
- Complex components

```typescript
// Example test
import { describe, it, expect } from 'vitest'
import { yourFunction } from '../your-file'

describe('yourFunction', () => {
  it('should handle valid input', () => {
    expect(yourFunction('input')).toBe('expected')
  })
  
  it('should handle edge cases', () => {
    expect(yourFunction('')).toBe('default')
  })
})
```

### Integration Tests

Required for:
- Server actions with database
- API routes
- Authentication flows

### E2E Tests

Required for:
- Critical user journeys
- New user-facing features

---

## Documentation Standards

### Code Comments

**DO:** Comment complex logic
```typescript
// Calculate prorated price based on days remaining
const proratedPrice = basePrice * (daysRemaining / totalDays)
```

**DON'T:** Comment obvious code
```typescript
// Get the user ID
const userId = user.id
```

### README Updates

Update `README.md` when:
- Adding new environment variables
- Changing setup process
- Adding new dependencies
- Modifying deployment process

### ADR Creation

Create an ADR when making significant technical decisions.

See [ADR Template](./adr/000-template.md).

---

## Security Guidelines

### Input Validation

Always validate user input with Zod:

```typescript
const Schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100)
})

const validated = Schema.parse(input)
```

### Authentication

Check authentication in every server action:

```typescript
const session = await auth()
if (!session) {
  return { message: 'Unauthorized' }
}
```

### Sensitive Data

- Never log passwords or tokens
- Use environment variables for secrets
- Don't expose internal errors to users

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- Increment MAJOR for breaking changes
- Increment MINOR for new features
- Increment PATCH for bug fixes

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Migration scripts tested
- [ ] Security audit passed
- [ ] Performance regression tests passed

---

## Getting Help

- **Questions:** Open a discussion on GitHub
- **Bugs:** Create an issue with reproduction steps
- **Security:** Email security@[domain].com (do not create public issue)

---

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Help others learn and grow
- Celebrate contributions

---

Thank you for contributing to Field Inspect! 🚀

*Last updated: 2025-11-24*
