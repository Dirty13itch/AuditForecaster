# Optimistic UI Patterns

**Energy Auditing Field Application - Version 1.0**

Comprehensive guide to implementing optimistic UI updates for instant-feeling interactions.

---

## Table of Contents

1. [Overview](#overview)
2. [Why Optimistic UI?](#why-optimistic-ui)
3. [Core Pattern](#core-pattern)
4. [Implementation Examples](#implementation-examples)
5. [Error Handling](#error-handling)
6. [Testing](#testing)
7. [Best Practices](#best-practices)

---

## Overview

Optimistic UI updates make the application feel instant by updating the UI immediately, before waiting for server confirmation. This pattern is inspired by Linear, Figma, and other world-class applications.

### Key Principles:
- **Assume success**: Update UI immediately
- **Rollback on error**: Revert changes if server fails
- **Visual feedback**: Show pending state during update
- **Error recovery**: Provide retry mechanism

---

## Why Optimistic UI?

### Traditional Flow (Slow):
```
User clicks → Show loading spinner → Wait for server → Update UI
                    ⏱️ 500-2000ms delay
```

### Optimistic Flow (Fast):
```
User clicks → Update UI immediately → Confirm with server in background
                    ✨ Instant feedback
```

### Benefits:
- **Perceived performance**: Feels 500ms-2s faster
- **Better UX**: Reduces cognitive load, users don't wait
- **Error visibility**: Errors are more noticeable with rollback
- **Offline support**: Works seamlessly with sync queue

### When to Use:
✅ High-frequency actions (job status, photo tags)
✅ Simple state changes (checkbox, status toggle)
✅ Predictable outcomes (known server response shape)
✅ User-initiated actions (clicks, form submissions)

### When NOT to Use:
❌ Complex validation (server-side business logic)
❌ Financial transactions (requires confirmation)
❌ Security-critical actions (password changes)
❌ Actions with unknown outcomes

---

## Core Pattern

### Using TanStack Query (React Query)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const updateJobStatus = useMutation({
  // 1. Define the mutation function
  mutationFn: async (data: { jobId: string; status: string }) => {
    const res = await apiRequest(
      'PATCH',
      `/api/jobs/${data.jobId}`,
      { status: data.status }
    );
    return res.json();
  },
  
  // 2. Optimistic update (before server response)
  onMutate: async (data) => {
    // Cancel outgoing refetches to avoid race conditions
    await queryClient.cancelQueries({ 
      queryKey: ['/api/jobs', data.jobId] 
    });
    
    // Snapshot current value for rollback
    const previousJob = queryClient.getQueryData(['/api/jobs', data.jobId]);
    
    // Optimistically update the cache
    queryClient.setQueryData(['/api/jobs', data.jobId], (old: any) => ({
      ...old,
      status: data.status,
      // Optional: Add optimistic indicator
      _optimistic: true
    }));
    
    // Return context for error rollback
    return { previousJob };
  },
  
  // 3. Handle errors (rollback)
  onError: (err, variables, context) => {
    // Restore previous state
    if (context?.previousJob) {
      queryClient.setQueryData(
        ['/api/jobs', variables.jobId],
        context.previousJob
      );
    }
    
    // Show error toast
    toast({
      variant: "destructive",
      title: "Update failed",
      description: "Failed to update job status. Please try again.",
    });
  },
  
  // 4. Handle success (confirm)
  onSuccess: (data, variables) => {
    // Optional: Show success toast
    toast({
      title: "Status updated",
      description: "Job status changed successfully.",
    });
  },
  
  // 5. Always refetch (regardless of success/error)
  onSettled: (data, error, variables) => {
    // Refetch to ensure data is in sync
    queryClient.invalidateQueries({ 
      queryKey: ['/api/jobs', variables.jobId] 
    });
  }
});
```

### Usage in Component:

```tsx
function JobCard({ job }: { job: Job }) {
  const { mutate, isPending } = updateJobStatusMutation;
  
  const handleStatusChange = (newStatus: string) => {
    mutate({
      jobId: job.id,
      status: newStatus
    });
  };
  
  return (
    <Card className={cn(isPending && "opacity-60")}>
      <Select 
        value={job.status}
        onValueChange={handleStatusChange}
        disabled={isPending}
      >
        {/* ... */}
      </Select>
      {isPending && <Spinner className="ml-2" />}
    </Card>
  );
}
```

---

## Implementation Examples

### 1. Job Status Change

**High-frequency action**: Field inspectors change job status 10-20 times per day.

```typescript
// hooks/useJobMutations.ts
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/jobs/${jobId}`, { status });
      return res.json();
    },
    
    onMutate: async ({ jobId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/jobs', jobId] });
      
      const previousJob = queryClient.getQueryData(['/api/jobs', jobId]);
      
      // Update single job
      queryClient.setQueryData(['/api/jobs', jobId], (old: any) => ({
        ...old,
        status,
        updatedAt: new Date().toISOString()
      }));
      
      // Also update job in list view
      queryClient.setQueryData(['/api/jobs'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((j: any) => 
            j.id === jobId ? { ...j, status } : j
          )
        };
      });
      
      return { previousJob };
    },
    
    onError: (err, { jobId }, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(['/api/jobs', jobId], context.previousJob);
      }
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: err.message
      });
    },
    
    onSuccess: (data) => {
      toast({
        title: "Status updated",
        description: `Job status changed to ${data.status}`
      });
    }
  });
}
```

### 2. Photo Tagging

**Highest-frequency action**: Inspectors add tags to 50-100 photos per day.

```typescript
export function useAddPhotoTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      photoId, 
      tags 
    }: { 
      photoId: string; 
      tags: string[] 
    }) => {
      const res = await apiRequest('PATCH', `/api/photos/${photoId}/tags`, { tags });
      return res.json();
    },
    
    onMutate: async ({ photoId, tags }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/photos-cursor'] });
      
      const previousPhotos = queryClient.getQueryData(['/api/photos-cursor']);
      
      // Update photo in infinite query cache
      queryClient.setQueriesData(
        { queryKey: ['/api/photos-cursor'] },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((photo: any) =>
                photo.id === photoId
                  ? { ...photo, tags: [...new Set([...photo.tags, ...tags])] }
                  : photo
              )
            }))
          };
        }
      );
      
      return { previousPhotos };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(
          ['/api/photos-cursor'],
          context.previousPhotos
        );
      }
      toast({
        variant: "destructive",
        title: "Failed to add tags",
        description: "Your tags were not saved. Please try again."
      });
    },
    
    onSuccess: () => {
      toast({
        title: "Tags added",
        description: "Photo tags updated successfully."
      });
    }
  });
}
```

### 3. Checkbox Toggle (Equipment Checkout)

**Frequent action**: Equipment checkout/checkin happens 5-10 times per shift.

```typescript
export function useToggleEquipmentCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      equipmentId, 
      checkedOut 
    }: { 
      equipmentId: string; 
      checkedOut: boolean 
    }) => {
      const res = await apiRequest(
        'PATCH', 
        `/api/equipment/${equipmentId}/checkout`,
        { checkedOut }
      );
      return res.json();
    },
    
    onMutate: async ({ equipmentId, checkedOut }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/equipment'] });
      
      const previousEquipment = queryClient.getQueryData(['/api/equipment']);
      
      queryClient.setQueryData(['/api/equipment'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((eq: any) =>
            eq.id === equipmentId
              ? {
                  ...eq,
                  checkedOut,
                  checkedOutBy: checkedOut ? 'current-user-id' : null,
                  checkedOutAt: checkedOut ? new Date().toISOString() : null
                }
              : eq
          )
        };
      });
      
      return { previousEquipment };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousEquipment) {
        queryClient.setQueryData(['/api/equipment'], context.previousEquipment);
      }
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: err.message
      });
    }
  });
}
```

### 4. List Item Deletion (with Undo)

**Moderate-frequency action**: Delete photos, jobs, or builders.

```typescript
export function useDeletePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Track deleted photos for undo
  const [deletedPhotos, setDeletedPhotos] = useState<Map<string, any>>(new Map());

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest('DELETE', `/api/photos/${photoId}`, undefined);
    },
    
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/photos-cursor'] });
      
      const previousData = queryClient.getQueryData(['/api/photos-cursor']);
      
      // Find and store the deleted photo
      let deletedPhoto: any = null;
      queryClient.setQueriesData(
        { queryKey: ['/api/photos-cursor'] },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => {
              const photo = page.data.find((p: any) => p.id === photoId);
              if (photo) deletedPhoto = photo;
              
              return {
                ...page,
                data: page.data.filter((p: any) => p.id !== photoId)
              };
            })
          };
        }
      );
      
      // Store for undo
      if (deletedPhoto) {
        setDeletedPhotos(prev => new Map(prev).set(photoId, deletedPhoto));
      }
      
      return { previousData, deletedPhoto };
    },
    
    onError: (err, photoId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/photos-cursor'], context.previousData);
      }
      setDeletedPhotos(prev => {
        const next = new Map(prev);
        next.delete(photoId);
        return next;
      });
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message
      });
    },
    
    onSuccess: (data, photoId) => {
      // Show undo toast
      const deletedPhoto = deletedPhotos.get(photoId);
      
      toast({
        title: "Photo deleted",
        description: "The photo has been removed.",
        action: (
          <ToastAction
            altText="Undo delete"
            onClick={() => handleUndo(photoId, deletedPhoto)}
          >
            Undo
          </ToastAction>
        )
      });
      
      // Clear from undo map after 5 seconds
      setTimeout(() => {
        setDeletedPhotos(prev => {
          const next = new Map(prev);
          next.delete(photoId);
          return next;
        });
      }, 5000);
    }
  });

  const handleUndo = async (photoId: string, photo: any) => {
    if (!photo) return;
    
    // Restore photo to cache
    queryClient.setQueriesData(
      { queryKey: ['/api/photos-cursor'] },
      (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            // Add to first page
            if (index === 0) {
              return {
                ...page,
                data: [photo, ...page.data]
              };
            }
            return page;
          })
        };
      }
    );
    
    // Call API to restore
    try {
      await apiRequest('POST', `/api/photos/${photoId}/restore`, undefined);
      toast({
        title: "Photo restored",
        description: "The photo has been restored."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Restore failed",
        description: "Failed to restore photo."
      });
    }
  };

  return deleteMutation;
}
```

### 5. Form Auto-Save

**Continuous action**: Auto-save form data as user types.

```typescript
export function useAutoSaveJob(jobId: string) {
  const queryClient = useQueryClient();
  const debouncedSave = useDebounce(500); // Wait 500ms after typing stops

  return useMutation({
    mutationFn: async (updates: Partial<Job>) => {
      const res = await apiRequest('PATCH', `/api/jobs/${jobId}`, updates);
      return res.json();
    },
    
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['/api/jobs', jobId] });
      
      const previous = queryClient.getQueryData(['/api/jobs', jobId]);
      
      queryClient.setQueryData(['/api/jobs', jobId], (old: any) => ({
        ...old,
        ...updates,
        _saving: true // Show "Saving..." indicator
      }));
      
      return { previous };
    },
    
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/jobs', jobId], (old: any) => ({
        ...old,
        _saving: false,
        _saved: true // Show "Saved" checkmark
      }));
      
      // Clear "Saved" indicator after 2s
      setTimeout(() => {
        queryClient.setQueryData(['/api/jobs', jobId], (old: any) => ({
          ...old,
          _saved: false
        }));
      }, 2000);
    },
    
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['/api/jobs', jobId], {
          ...context.previous,
          _saving: false,
          _error: true
        });
      }
    }
  });
}

// Usage in form
function JobForm({ jobId }: { jobId: string }) {
  const { mutate: saveJob } = useAutoSaveJob(jobId);
  const [formData, setFormData] = useState({});
  
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Debounced optimistic save
    debouncedSave(() => {
      saveJob({ [field]: value });
    });
  };
  
  return (
    <form>
      <Input
        value={formData.address}
        onChange={(e) => handleChange('address', e.target.value)}
      />
      <AutoSaveIndicator jobId={jobId} />
    </form>
  );
}
```

---

## Error Handling

### Visual Error States:

```tsx
function OptimisticComponent() {
  const { mutate, isPending, isError, error } = useMutation(...);
  
  return (
    <Card className={cn(
      isPending && "opacity-60",
      isError && "border-destructive"
    )}>
      {/* Content */}
      
      {isPending && (
        <div className="absolute top-2 right-2">
          <Spinner className="w-4 h-4" />
        </div>
      )}
      
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Update Failed</AlertTitle>
          <AlertDescription>
            {error.message}
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
```

### Toast Notifications:

```typescript
// Success
toast({
  title: "✓ Saved",
  description: "Changes saved successfully.",
  duration: 2000
});

// Error with retry
toast({
  variant: "destructive",
  title: "Save failed",
  description: error.message,
  action: (
    <ToastAction altText="Retry" onClick={() => retry()}>
      Retry
    </ToastAction>
  )
});

// Undo
toast({
  title: "Item deleted",
  action: (
    <ToastAction altText="Undo" onClick={handleUndo}>
      Undo
    </ToastAction>
  ),
  duration: 5000
});
```

---

## Testing

### Unit Tests:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateJobStatus } from './useJobMutations';

describe('useUpdateJobStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
  });

  it('optimistically updates job status', async () => {
    const { result } = renderHook(() => useUpdateJobStatus(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    });

    // Set initial data
    queryClient.setQueryData(['/api/jobs', 'job-1'], {
      id: 'job-1',
      status: 'pending'
    });

    // Trigger mutation
    result.current.mutate({ jobId: 'job-1', status: 'in-progress' });

    // Check optimistic update (before server response)
    const updatedData = queryClient.getQueryData(['/api/jobs', 'job-1']);
    expect(updatedData).toMatchObject({ status: 'in-progress' });
  });

  it('rolls back on error', async () => {
    // Mock API error
    global.fetch = jest.fn(() => 
      Promise.reject(new Error('Network error'))
    );

    const { result } = renderHook(() => useUpdateJobStatus(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    });

    queryClient.setQueryData(['/api/jobs', 'job-1'], {
      id: 'job-1',
      status: 'pending'
    });

    result.current.mutate({ jobId: 'job-1', status: 'in-progress' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Check rollback
    const rolledBackData = queryClient.getQueryData(['/api/jobs', 'job-1']);
    expect(rolledBackData).toMatchObject({ status: 'pending' });
  });
});
```

---

## Best Practices

### 1. Always Cancel Outgoing Queries
```typescript
await queryClient.cancelQueries({ queryKey: ['/api/jobs', jobId] });
```
Prevents race conditions where old data overwrites optimistic updates.

### 2. Snapshot Previous State
```typescript
const previous = queryClient.getQueryData(['/api/jobs', jobId]);
return { previous }; // For rollback
```
Essential for error recovery.

### 3. Update All Relevant Caches
```typescript
// Update single item
queryClient.setQueryData(['/api/jobs', jobId], newData);

// Update list
queryClient.setQueryData(['/api/jobs'], (old) => 
  updateItemInList(old, jobId, newData)
);

// Update cursor-based pagination
queryClient.setQueriesData({ queryKey: ['/api/photos-cursor'] }, updatePages);
```

### 4. Show Visual Pending State
```tsx
<Button disabled={isPending}>
  {isPending && <Spinner />}
  Save
</Button>
```

### 5. Provide Error Recovery
```typescript
onError: () => {
  toast({
    action: <ToastAction onClick={retry}>Retry</ToastAction>
  });
}
```

### 6. Consider Offline Support
```typescript
// Mutation will queue if offline
const res = await apiRequest('PATCH', url, data);
// Will sync when back online
```

### 7. Use Debouncing for High-Frequency Updates
```typescript
const debouncedSave = useDebounce(saveChanges, 500);
// Prevents excessive server requests
```

### 8. Invalidate After Settlement
```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
}
```
Ensures cache is eventually consistent with server.

---

## Performance Considerations

### Memory Usage:
- Don't store large objects in context (previous state)
- Clear undo maps after timeout
- Limit undo history depth

### Network:
- Debounce high-frequency mutations
- Batch multiple updates when possible
- Use optimistic UI to reduce perceived latency, not to spam the server

### Cache Management:
- Invalidate sparingly (only what changed)
- Use `setQueryData` instead of `invalidateQueries` when possible
- Clean up unused cache entries

---

## Monitoring & Analytics

Track optimistic update performance:

```typescript
onMutate: async (variables) => {
  const startTime = performance.now();
  
  // ... optimistic update
  
  const updateTime = performance.now() - startTime;
  analytics.track('optimistic_update', {
    action: 'job_status_change',
    duration: updateTime,
    success: true
  });
  
  return { previous, startTime };
},

onError: (err, variables, context) => {
  analytics.track('optimistic_update', {
    action: 'job_status_change',
    duration: performance.now() - context.startTime,
    success: false,
    error: err.message
  });
}
```

---

## Conclusion

Optimistic UI updates transform the user experience from "waiting" to "instant". By following these patterns, you can implement fast, reliable updates while maintaining data integrity and error recovery.

**Key Takeaways:**
✅ Update UI immediately
✅ Snapshot previous state
✅ Rollback on error
✅ Show visual feedback
✅ Provide error recovery
✅ Test thoroughly

**Happy optimizing! ⚡**
