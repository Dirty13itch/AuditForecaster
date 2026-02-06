# Field Inspect Code Standards

## Purpose

This document defines the coding standards and best practices for the Field Inspect project to ensure consistency, maintainability, and quality across the codebase.

---

## Table of Contents

1. [TypeScript Standards](#typescript-standards)
2. [File Organization](#file-organization)
3. [Naming Conventions](#naming-conventions)
4. [Component Standards](#component-standards)
5. [Server Actions Standards](#server-actions-standards)
6. [Error Handling](#error-handling)
7. [Testing Standards](#testing-standards)
8. [Performance Guidelines](#performance-guidelines)

---

## TypeScript Standards

### Configuration

**Strict Mode:** Always enabled
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Type Annotations

**DO:** Explicitly type function parameters and return types
```typescript
// ✅ Good
export async function createBuilder(formData: FormData): Promise<ActionResult> {
  // ...
}
```

**DON'T:** Rely on inference for public APIs
```typescript
// ❌ Bad
export async function createBuilder(formData) {
  // ...
}
```

### Type Definitions

**DO:** Create shared types in dedicated files
```typescript
// types/index.ts
export type ActionResult = {
  message: string
  error?: string
}

export type Job = {
  id: string
  status: JobStatus
  // ...
}
```

**DO:** Use Prisma types when possible
```typescript
import { Job, Builder } from '@prisma/client'

type JobWithBuilder = Job & {
  builder: Builder
}
```

### Avoid `any`

**DO:** Use `unknown` and type guards
```typescript
// ✅ Good
function handleError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
```

**DON'T:** Use `any`
```typescript
// ❌ Bad
function handleError(error: any) {
  return error.message
}
```

---

## File Organization

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Route groups
│   ├── actions/            # Server Actions
│   ├── api/                # API Routes
│   └── ...
├── components/             # React Components
│   ├── ui/                 # shadcn/ui components
│   └── ...
├── lib/                    # Utilities and services
│   ├── prisma.ts
│   ├── logger.ts
│   └── ...
├── hooks/                  # Custom React hooks
└── types/                  # Shared type definitions
```

### File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Components | `kebab-case.tsx` | `user-profile.tsx` |
| Server Actions | `kebab-case.ts` | `builders.ts` |
| API Routes | `route.ts` | `route.ts` |
| Utilities | `kebab-case.ts` | `date-utils.ts` |
| Types | `kebab-case.ts` | `api-types.ts` |
| Tests | `*.test.ts` | `builders.test.ts` |

---

## Naming Conventions

### Variables and Functions

**camelCase** for variables, functions, and methods
```typescript
const userName = 'John'
function getUserById(id: string) { }
```

**PascalCase** for types, interfaces, classes, components
```typescript
type UserProfile = { }
interface BuilderData { }
class PricingService { }
function UserCard() { }
```

**UPPER_SNAKE_CASE** for constants
```typescript
const MAX_UPLOAD_SIZE = 5_000_000
const DEFAULT_TIMEZONE = 'America/Chicago'
```

### Component Naming

**DO:** Use descriptive, specific names
```typescript
// ✅ Good
function JobScheduleCalendar() { }
function InspectionPhotoGallery() { }
```

**DON'T:** Use generic names
```typescript
// ❌ Bad
function Calendar() { }
function Gallery() { }
```

---

## Component Standards

### Server Components (Default)

**DO:** Use Server Components by default
```typescript
// ✅ Good - Server Component (no 'use client')
export default async function JobsPage() {
  const jobs = await prisma.job.findMany()
  return <JobList jobs={jobs} />
}
```

### Client Components

**DO:** Use "use client" only when needed
```typescript
// ✅ Good - Only when interactivity needed
'use client'

import { useState } from 'react'

export function InteractiveForm() {
  const [value, setValue] = useState('')
  // ...
}
```

**When to use "use client":**
- useState, useEffect, useContext
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)
- Third-party libraries requiring browser

### Component Structure

```typescript
// 1. Imports (grouped)
import { type ReactNode } from 'react'
import { prisma } from '@/lib/prisma'

// 2. Types/Interfaces
interface Props {
  children: ReactNode
  title: string
}

// 3. Component
export function MyComponent({ children, title }: Props) {
  // 4. Hooks
  // 5. Event handlers
  // 6. Render logic
  return <div>{children}</div>
}
```

---

## Server Actions Standards

### Template

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { auth } from '@/auth'

// 1. Validation Schema
const EntitySchema = z.object({
  name: z.string().min(1, 'Name required'),
  // ...
})

// 2. Type Definition
type ActionResult = {
  message: string
  error?: string
}

// 3. Action Function
export async function createEntity(
  formData: FormData
): Promise<ActionResult> {
  // 3a. Authentication
  const session = await auth()
  if (!session) {
    return { message: 'Unauthorized', error: 'auth' }
  }

  try {
    // 3b. Validation
    const validatedFields = EntitySchema.parse({
      name: formData.get('name'),
      // ...
    })

    // 3c. Business Logic
    await prisma.entity.create({
      data: validatedFields
    })

    // 3d. Cache Revalidation
    revalidatePath('/dashboard/entities')

    // 3e. Success Response
    return { message: 'Entity created successfully' }
    
  } catch (error) {
    // 3f. Error Logging
    logger.error('Failed to create entity', {
      error: error instanceof Error ? error.message : String(error),
      entityName: formData.get('name'),
      userId: session.user.id
    })

    // 3g. Error Response
    return { 
      message: 'Failed to create entity',
      error: 'unknown'
    }
  }
}
```

### Required Elements

- ✅ `'use server'` directive
- ✅ Zod validation for inputs
- ✅ Authentication check
- ✅ Structured error logging
- ✅ Type-safe return values
- ✅ Cache revalidation where needed

---

## Error Handling

### Logging Standards

**DO:** Use structured logger with context
```typescript
// ✅ Good
logger.error('Failed to create builder', {
  error: e instanceof Error ? e.message : String(e),
  builderName: formData.get('name'),
  userId: session.user.id
})
```

**DON'T:** Use console.error (except in error boundaries)
```typescript
// ❌ Bad (in server actions)
console.error(e)
```

### Error Messages

**DO:** User-friendly messages
```typescript
// ✅ Good
return { 
  message: 'Failed to create builder. Please try again.',
  error: 'validation'
}
```

**DON'T:** Expose internal errors
```typescript
// ❌ Bad
return { message: error.stack }
```

---

## Testing Standards

### File Location

Tests live next to the code they test:
```
src/app/actions/
├── builders.ts
└── __tests__/
    └── builders.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBuilder } from '../builders'

describe('createBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create builder with valid data', async () => {
    // Arrange
    const formData = new FormData()
    formData.set('name', 'Test Builder')

    // Act
    const result = await createBuilder(formData)

    // Assert
    expect(result.message).toBe('Builder created successfully')
  })

  it('should validate required fields', async () => {
    // Test validation
  })

  it('should handle errors gracefully', async () => {
    // Test error handling
  })
})
```

### Coverage Requirements

| Code Type | Minimum Coverage |
|-----------|-----------------|
| Server Actions | 90% |
| Utilities | 100% |
| Components | 80% |
| Overall | 80% |

---

## Performance Guidelines

### Database Queries

**DO:** Use includes to avoid N+1 queries
```typescript
// ✅ Good
const jobs = await prisma.job.findMany({
  include: { builder: true, inspector: true }
})
```

**DON'T:** Loop and query
```typescript
// ❌ Bad
const jobs = await prisma.job.findMany()
for (const job of jobs) {
  const builder = await prisma.builder.findUnique({ 
    where: { id: job.builderId } 
  })
}
```

### Component Optimization

**DO:** Use React.memo for expensive components
```typescript
import { memo } from 'react'

export const ExpensiveComponent = memo(function ExpensiveComponent(props) {
  // Expensive rendering logic
})
```

**DO:** Extract static data
```typescript
// ✅ Good - computed once
const PRICING_TIERS = [
  { name: 'Basic', price: 100 },
  { name: 'Premium', price: 200 }
]

function PricingTable() {
  return <Table data={PRICING_TIERS} />
}
```

---

## Code Review Checklist

Before submitting PR, verify:

- [ ] TypeScript strict mode passes
- [ ] ESLint passes with no warnings
- [ ] Tests written and passing
- [ ] Error logging uses structured logger
- [ ] Authentication checked in server actions
- [ ] Input validation with Zod
- [ ] Cache revalidation where needed
- [ ] No console.* in production code
- [ ] Performance considered (N+1 queries avoided)
- [ ] Types are explicit for public APIs

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application/best-practices)
- [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

*Last updated: 2025-11-24*
