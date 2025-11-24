# Server Actions API Documentation

> Complete API reference for all server actions in AuditForecaster

**Base Path**: `src/app/actions/`

---

## Authentication

All server actions (except read-only getters) require authentication via NextAuth.js session.

```typescript
const session = await auth()
if (!session) throw new Error("Unauthorized")
```

---

## Builders API

### `createBuilder(data)`
Creates a new builder partnership.

**Input**:
```typescript
{
    name: string (min 1 char)
    email?: string (valid email)
    phone?: string
    address?: string
}
```

**Returns**:
```typescript
{ success: boolean, data?: Builder, error?: string }
```

**Validation**: Zod schema ensures name is required.

---

### `updateBuilder(id, data)`
Updates an existing builder.

**Input**:
- `id`: string (UUID)
- `data`: Partial<Builder>

**Returns**: Same as createBuilder

---

### `deleteBuilder(id)`
Deletes a builder.

**Input**: `id` (UUID string)

**Returns**: `{ success: boolean, error?: string }`

---

## Jobs API

### `createJob(formData)`
Creates a new inspection job.

**FormData Fields**:
- `lotNumber`: string (required)
- `streetAddress`: string (required)
- `city`: string (required)
- `builderId`: string (UUID, required)
- `inspectorId`: string (UUID, optional)

**Validation**: Zod schema via `JobFormSchema`

**Returns**: `{ success: boolean, data?: Job, error?: string }`

---

### `updateJobStatus(id, status)`
Updates job status.

**Input**:
- `id`: string (UUID)
- `status`: JobStatus enum

**Returns**: `{ success: boolean }`

---

## Inspections API

### `updateInspection(formData)`
Updates or creates an inspection for a job.

**FormData Fields**:
- `jobId`: string (UUID, required)
- `cfm50`: number (required)
- `houseVolume`: number (optional)
- `checklist`: JSON string (ChecklistItem[])
- `signature`: string (data URL, optional)
- `notes`: string (optional)

**Auto-calculated**: `ach50` is calculated from cfm50 and houseVolume

**Validation**: Zod schema ensures cfm50 is positive

**Side Effects**: Sends email to builder on completion

---

## Pricing API

### `createServiceItem(data)`
Creates a new service item.

**Input**:
```typescript
{
    name: string (min 1 char)
    description?: string
    basePrice: number (min 0)
}
```

**Returns**: `{ success: boolean, data?: ServiceItem, error?: string }`

---

### `createPriceList(data)`
Creates a new price list.

**Input**:
```typescript
{
    name: string (min 1 char)
    builderId?: string (UUID)
    subdivisionId?: string (UUID)
}
```

---

### `upsertPriceListItem(priceListId, serviceItemId, price)`
Creates or updates a price list item.

**Input**:
- `priceListId`: string (UUID)
- `serviceItemId`: string (UUID)
- `price`: number (min 0)

**Validation**: All parameters validated as UUIDs and positive numbers

---

## Equipment API

### `createEquipment(data)`
Adds new equipment to company assets.

**Input**: Equipment data with validation

### `updateEquipment(id, data)`
Updates equipment details.

### `deleteEquipment(id)`
Removes equipment from inventory.

---

## Fleet API

### `createVehicle(data)`
Adds a new vehicle to the fleet.

**Input**: Vehicle data (make, model, year, VIN, etc.)

### `updateVehicle(id, data)`
Updates vehicle information.

### `deleteVehicle(id)`
Removes vehicle from fleet.

---

## Finances API

### `classifyMileage(id, purpose)`
Classifies a mileage log entry.

**Input**:
- `id`: string (UUID)
- `purpose`: "Business" | "Personal"

**Validation**: Enum validation ensures only valid purposes

**Side Effects**: Updates status to "APPROVED"

---

### `classifyExpense(id, status, category)`
Classifies an expense.

**Input**:
- `id`: string (UUID)
- `status`: "CLASSIFIED"
- `category`: string (min 1 char)

**Validation**: UUID, enum, and string length validation

---

## QA API

### `approveJob(formData)`
Approves a job after QA review.

**FormData**:
- `jobId`: string (UUID, required)

**Validation**: UUID validation

**Side Effects**: 
- Changes status to "INVOICED"
- Redirects to /dashboard/qa

---

### `rejectJob(formData)`
Rejects a job with a reason.

**FormData**:
- `jobId`: string (UUID, required)
- `reason`: string (min 1 char, required)

**Side Effects**:
- Changes status to "IN_PROGRESS"
- Sends email to inspector
- Redirects to /dashboard/qa

---

## Templates API

### `createTemplate(formData)`
Creates a new report template.

**FormData**:
- `name`: string (min 1 char)
- `checklistItems`: JSON string (array of {label: string})

**Validation**: 
- Name required
- JSON parsing with error handling
- Checklist structure validation

---

### `updateTemplate(id, formData)`
Updates an existing template.

**FormData**: Same as createTemplate + `isDefault` boolean

**Side Effects**: If `isDefault` is true, unsets all other default templates

---

### `deleteTemplate(id)`
Deletes a template.

**Input**: `id` (UUID)

**Validation**: UUID validation

---

## Subdivisions API

### `createSubdivision(data)`
Creates a new subdivision.

**Input**:
```typescript
{
    name: string (min 1 char)
    builderId: string (UUID)
}
```

### `updateSubdivision(id, data)`
Updates subdivision name.

### `deleteSubdivision(id)`
Deletes a subdivision.

---

## PDF API

### `generatePDF(jobId)`
Generates a PDF report for a completed job.

**Input**: `jobId` (string, UUID)

**Returns**: PDF as base64 string

**Process**:
1. Fetches job and inspection data
2. Launches Puppeteer headless browser
3. Navigates to `/dashboard/reports/{id}`
4. Generates PDF
5. Returns base64-encoded PDF

**Requirements**: Chromium must be installed

---

## Error Handling

All server actions follow consistent error handling:

1. **Authentication**: Returns error or throws if unauthorized
2. **Validation**: Returns `{ success: false, error: string }` for invalid input
3. **Database errors**: Caught and logged, returns generic error message
4. **Redirects**: Some actions use `redirect()` which throws

---

## Example Usage

### In Server Component
```typescript
import { createJob } from '@/app/actions/jobs'

export default async function Page() {
    async function handleCreate(formData: FormData) {
        'use server'
        const result = await createJob(formData)
        if (!result.success) {
            // Handle error
        }
        revalidatePath('/dashboard/jobs')
    }
    
    return <form action={handleCreate}>...</form>
}
```

### In Client Component
```typescript
import { createJob } from '@/app/actions/jobs'

function MyForm() {
    async function handleSubmit(formData: FormData) {
        const result = await createJob(formData)
        if (result.success) {
            toast.success("Job created!")
        } else {
            toast.error(result.error)
        }
    }
    
    return <form action={handleSubmit}>...</form>
}
```

---

## Best Practices

1. **Always validate input** with Zod schemas
2. **Return consistent response format** ({ success, data?, error? })
3. **Use revalidatePath** to update UI after mutations
4. **Log errors** to console for debugging
5. **Provide helpful error messages** to users

---

**Last Updated**: 2025-11-23  
**Version**: 1.0.0
