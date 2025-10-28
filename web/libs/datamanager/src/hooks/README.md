# DataManager Hooks

This directory contains React hooks for the DataManager library, following modern React patterns with TanStack Query for data fetching.

## Available Hooks

### `useActions`

A hook for fetching available actions from the DataManager API using TanStack Query.

#### Features

- **Automatic caching**: Actions are cached for 5 minutes by default
- **Lazy loading**: Only fetches when enabled (e.g., when dropdown is opened)
- **Error handling**: Built-in error states
- **Loading states**: Provides both initial loading and refetching states
- **Type safety**: Full TypeScript support

#### Usage

```tsx
import { useActions } from "../hooks/useActions";

function ActionsDropdown({ projectId }) {
  const {
    actions,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useActions({
    projectId, // Optional: Used for cache scoping per project
    enabled: isOpen, // Only fetch when dropdown is opened
    staleTime: 5 * 60 * 1000, // Optional: 5 minutes
    cacheTime: 10 * 60 * 1000, // Optional: 10 minutes
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      {actions.map((action) => (
        <button key={action.id}>{action.title}</button>
      ))}
    </div>
  );
}
```

#### Parameters

- `options.projectId` (string, optional): Project ID for scoping the query cache. When provided, actions are cached per project, preventing cache conflicts in multi-project scenarios
- `options.enabled` (boolean, default: `true`): Whether to enable the query
- `options.staleTime` (number, default: `5 * 60 * 1000`): Time in ms before data is considered stale
- `options.cacheTime` (number, default: `10 * 60 * 1000`): Time in ms before unused data is garbage collected

#### Return Value

- `actions` (Action[]): Array of available actions
- `isLoading` (boolean): True on first load
- `isFetching` (boolean): True whenever data is being fetched
- `isError` (boolean): True if the query failed
- `error` (Error): The error object if query failed
- `refetch` (function): Function to manually refetch the data

### `useDataManagerUsers`

A hook for fetching users from the DataManager API with infinite pagination support.

See `useUsers.ts` for documentation.

### Other Hooks

- `useFirstMountState`: Utility hook to detect first mount
- `useUpdateEffect`: Effect hook that skips the first render

## Migration from MobX to TanStack Query

The DataManager is gradually migrating from MobX State Tree flows to TanStack Query hooks for better performance, caching, and developer experience.

### Why TanStack Query?

1. **Automatic caching**: Reduces unnecessary API calls
2. **Better loading states**: Built-in loading, error, and refetching states
3. **Background refetching**: Keeps data fresh automatically
4. **Query invalidation**: Easy cache management
5. **TypeScript support**: Full type safety out of the box
6. **React best practices**: Follows modern React patterns recommended in project rules

### Coexistence with MobX

The hooks replace the need for MobX flows for data fetching:

- **Old code**: `store.fetchActions()` is now deprecated but kept for backward compatibility
- **New code**: Should always use `useActions()` hook
- **Migration complete**: The actions endpoint is now only called via the `useActions` hook, preventing duplicate API calls

### Example Migration

**Before (MobX):**
```javascript
useEffect(() => {
  if (isOpen && actions.length === 0) {
    setIsLoading(true);
    store.fetchActions().finally(() => {
      setIsLoading(false);
    });
  }
}, [isOpen, actions.length, store]);
```

**After (TanStack Query):**
```typescript
const { actions, isLoading, isFetching } = useActions({
  projectId, // Optional: for cache scoping
  enabled: isOpen,
});
```

## Best Practices

1. **Use lazy loading**: Set `enabled: false` for data that's not immediately needed
2. **Scope by projectId**: Always pass `projectId` when working with project-specific data to prevent cache conflicts
3. **Configure cache times**: Adjust `staleTime` and `cacheTime` based on data freshness requirements
4. **Handle loading states**: Always provide loading UI for better UX
5. **Handle errors**: Display user-friendly error messages
6. **Type everything**: Use TypeScript interfaces for type safety

## QueryClient Setup

The QueryClient is configured at the app level in `App.tsx`:

```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@humansignal/core/lib/utils/query-client";

<QueryClientProvider client={queryClient}>
  <Provider store={app}>
    {/* App content */}
  </Provider>
</QueryClientProvider>
```

This ensures all hooks have access to the shared query cache.

