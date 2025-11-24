# ADR-002: Prisma ORM for Database Access

**Status:** Accepted

**Date:** 2025-11-24

**Deciders:** Development Team

**Technical Story:** Database access layer selection for AuditForecaster

---

## Context and Problem Statement

AuditForecaster needs a robust database access solution that provides:
- Type-safe database queries
- Schema migration management
- Support for PostgreSQL
- Good developer experience
- Production-ready performance

**Driving Forces:**
- Type safety critical for data integrity
- Complex relational data (jobs, builders, inspections, photos)
- Need for migration versioning
- Team productivity and maintainability

## Decision Drivers

* Type safety (TypeScript integration)
* Developer experience (autocomplete, error checking)
* Migration management (version control, rollback)
* Query performance
* Ecosystem maturity
* Learning curve for team

## Considered Options

* **Prisma ORM**
* **Drizzle ORM**
* **TypeORM**
* **Kysely**
* **Raw SQL with pg**

## Decision Outcome

**Chosen option:** "Prisma ORM"

**Rationale:**
- Best-in-class TypeScript support
- Declarative schema definition
- Excellent migration tooling
- Strong type inference from schema
- Active development and community
- Good performance with connection pooling
- Prisma Studio for database visualization

### Positive Consequences

* Full type safety from database to UI
* Migrations are version controlled
* Schema changes propagate types automatically
* Reduced SQL injection risk
* Excellent developer productivity
* Built-in query optimization
* Prisma Studio helps debugging

### Negative Consequences

* Some queries require raw SQL for complex operations
* Additional abstraction layer (minimal overhead)
* Schema migrations must be managed carefully
* Vendor-specific patterns

## Pros and Cons of the Options

### Prisma ORM

**Pros:**
* Exceptional TypeScript support with generated client
* Declarative schema is single source of truth
* Migration system handles versioning well
* Great documentation and community
* Prisma Studio for database inspection
* Good performance characteristics
* Handles relationships elegantly

**Cons:**
* Some complex queries need raw SQL
* Generated client can be large
* Learning curve for Prisma-specific patterns
* Must regenerate client after schema changes

### Drizzle ORM

**Pros:**
* Lighter weight than Prisma
* Good TypeScript support
* SQL-like query syntax

**Cons:**
* Smaller community
* Less mature migration tooling
* Less tooling overall (no Studio equivalent)

### TypeORM

**Pros:**
* Mature and widely used
* Active Record and Data Mapper patterns

**Cons:**
* Weaker TypeScript support
* More boilerplate code
* Migration system less elegant
* ActiveRecord pattern can lead to tight coupling

## Implementation Notes

### Connection Pooling
Using Prisma with connection pooling for production:

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error']
})
```

### Schema Organization
- All models in single `schema.prisma` file
- Enums for status fields
- Proper indexes for performance
- Relations clearly defined

### Migration Strategy
- Development: `prisma migrate dev`
- Production: `prisma migrate deploy` (in Dockerfile)
- Never edit migrations after they're committed

## Links

* [Prisma Documentation](https://www.prisma.io/docs)
* [Schema Reference](../../prisma/schema.prisma)
* Related: [ADR-001](./001-nextjs-framework-choice.md) - Framework choice

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-24 | Development Team | Initial creation |
