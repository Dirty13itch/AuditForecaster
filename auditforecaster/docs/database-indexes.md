# Database Performance Optimization

This migration adds indexes to frequently queried fields to improve query performance.

## Indexes Added

### Job Model
- `status` - Frequently filtered in dashboard queries (PENDING, INVOICED, etc.)
- `builderId` - Used in pricing lookups and builder-specific queries
- `inspectorId` - Used in inspector job lists
- `createdAt` - Used for sorting and date-range queries

### Inspection Model
- `jobId` - Used to fetch inspections for a specific job
- `createdAt` - Used for sorting (latest inspection first)

### PriceList Model
- `builderId` - Critical for pricing lookups in `getJobPrice()`
- `subdivisionId` - Used for subdivision-specific pricing

## Performance Impact

These indexes will significantly improve:
1. Dashboard loading (status filtering)
2. Invoice generation (builderId pricing lookup)
3. Job detail pages (inspection fetching)
4. Analytics queries (date-based filtering)

## Migration Command

```bash
npx prisma migrate dev --name add_performance_indexes
```
