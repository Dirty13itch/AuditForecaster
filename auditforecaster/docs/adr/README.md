# Architecture Decision Records

This directory contains all Architecture Decision Records (ADRs) for AuditForecaster.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## ADR Process

1. **Propose** - Create new ADR from template with status "Proposed"
2. **Review** - Team reviews and discusses
3. **Decide** - Update status to "Accepted" or "Rejected"
4. **Implement** - Implement the decision
5. **Update** - If superseded, update to reference new ADR

## ADR Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [001](./001-nextjs-framework-choice.md) | Next.js 15 Framework Choice | Accepted | 2025-11-24 |
| [002](./002-prisma-orm-selection.md) | Prisma ORM for Database Access | Accepted | 2025-11-24 |
| [003](./003-structured-logging-strategy.md) | Structured Logging with Custom Logger | Accepted | 2025-11-24 |

## Creating a New ADR

```bash
# Copy template
cp 000-template.md 00X-your-title.md

# Edit with your decision
# Update the index above
# Create PR for review
```

## ADR Lifecycle

```
Proposed → Accepted → [Implemented] → [Superseded/Deprecated]
         ↓
      Rejected
```

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Michael Nygard's ADR article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
