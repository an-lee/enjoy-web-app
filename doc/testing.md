# Testing Guide

## Overview

This project uses **Vitest** as the testing framework with **React Testing Library** for component and hook testing. The testing system is designed to be:

- **Fast**: Parallel test execution with smart caching
- **Reliable**: Proper mocking and isolation between tests
- **Developer-friendly**: Watch mode, UI, and coverage reports

## Quick Start

```bash
# Run all tests once
bun run test

# Run tests in watch mode (recommended for development)
bun run test:watch

# Run tests with UI (interactive browser interface)
bun run test:ui

# Run tests with coverage report
bun run test:coverage

# Run tests only for changed files
bun run test:changed
```

## Project Structure

```
src/
├── tests/
│   ├── setup.ts          # Global test setup and mocks
│   ├── mocks/
│   │   ├── index.ts      # Central mock exports
│   │   ├── dexie.ts      # IndexedDB mock implementation
│   │   └── zustand.ts    # Zustand store testing utilities
│   └── utils/
│       ├── index.ts      # Central utility exports
│       └── render.tsx    # Custom render with providers
├── lib/
│   └── *.test.ts         # Utility function tests
├── db/
│   ├── id-generator.test.ts
│   └── stores/*.test.ts  # Database store tests
├── stores/
│   └── *.test.ts         # Zustand store tests
├── hooks/
│   └── *.test.ts         # React hook tests
└── components/
    └── **/*.test.tsx     # Component tests
```

## Test File Conventions

- **Location**: Tests are colocated with their source files
- **Naming**: `*.test.ts` or `*.test.tsx` (preferred) or `*.spec.ts`
- **Imports**: Use `@/tests/utils` for test utilities

## Writing Tests

### Unit Tests (Utilities)

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './my-module'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction(input)).toBe(expectedOutput)
  })
})
```

### Zustand Store Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useMyStore } from './my-store'

describe('MyStore', () => {
  beforeEach(() => {
    // Reset store state
    localStorage.clear()
    const { setState } = useMyStore
    act(() => {
      setState(initialState, true)
    })
  })

  it('should update state', () => {
    const { myAction } = useMyStore.getState()
    act(() => {
      myAction('value')
    })
    expect(useMyStore.getState().myValue).toBe('value')
  })
})
```

### Database Store Tests (Dexie)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the database module before imports
vi.mock('@/db/schema', () => ({
  db: mockDb,
}))

import { myStoreFunction } from './my-store'

describe('MyStore', () => {
  beforeEach(() => {
    mockDb.clear()
    vi.clearAllMocks()
  })

  it('should save data', async () => {
    await myStoreFunction({ data: 'test' })
    expect(mockDb.myTable.put).toHaveBeenCalled()
  })
})
```

### React Hook Tests

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@/tests/utils'
import { useMyHook } from './use-my-hook'

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe(initialValue)
  })

  it('should update state', () => {
    const { result } = renderHook(() => useMyHook())
    act(() => {
      result.current.setValue('new value')
    })
    expect(result.current.value).toBe('new value')
  })
})
```

### Component Tests

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@/tests/utils'
import { MyComponent } from './my-component'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })

  it('should handle click', async () => {
    const onClickMock = vi.fn()
    render(<MyComponent onClick={onClickMock} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onClickMock).toHaveBeenCalled()
  })
})
```

## Test Utilities

### Custom Render

The custom render function (`@/tests/utils`) automatically wraps components with:

- **QueryClientProvider**: For React Query hooks
- **Other providers**: Add as needed

```typescript
import { render, renderHook } from '@/tests/utils'

// Render with all providers
const { queryClient } = render(<MyComponent />)

// Render hook with all providers
const { result, queryClient } = renderHook(() => useMyHook())
```

### Mock Data Factories

```typescript
import {
  createMockVideo,
  createMockAudio,
  createMockTranslation,
} from '@/tests/mocks'

const video = createMockVideo({ title: 'Custom Title' })
const translation = createMockTranslation()
```

### Common Test Helpers

```typescript
import {
  wait,
  waitFor,
  createDeferred,
  randomString,
  createMockBlob,
  createMockAudioBlob,
} from '@/tests/utils'

// Wait for async operations
await wait(100)

// Wait for condition
await waitFor(() => element.visible)

// Create deferred promise for async testing
const { promise, resolve, reject } = createDeferred<string>()
```

## Mocking Guidelines

### Browser APIs

Browser APIs are automatically mocked in `src/tests/setup.ts`:

- `window.matchMedia`
- `localStorage` / `sessionStorage`
- `ResizeObserver`
- `IntersectionObserver`
- `crypto.subtle.digest`

### External Modules

```typescript
// Mock entire module
vi.mock('external-module', () => ({
  default: vi.fn(),
  namedExport: vi.fn(),
}))

// Mock specific function
import { someFunction } from 'external-module'
vi.mocked(someFunction).mockReturnValue('mocked value')
```

### i18n

i18n is automatically mocked to return translation keys:

```typescript
// In tests, t('key') returns 'key'
// t('key', { defaultValue: 'Default' }) returns 'Default'
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad: Testing implementation details
expect(component.state.isOpen).toBe(true)

// ✅ Good: Testing behavior
expect(screen.getByRole('dialog')).toBeVisible()
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => {})

// ✅ Good
it('should display error message when form validation fails', () => {})
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should update user name', () => {
  // Arrange
  const { setName } = useUserStore.getState()

  // Act
  act(() => {
    setName('New Name')
  })

  // Assert
  expect(useUserStore.getState().name).toBe('New Name')
})
```

### 4. Isolate Tests

```typescript
beforeEach(() => {
  // Reset state before each test
  localStorage.clear()
  vi.clearAllMocks()
})
```

### 5. Avoid Test Interdependencies

Each test should be able to run independently. Don't rely on state from previous tests.

### 6. Mock at the Boundary

Mock external dependencies (APIs, databases) not internal functions.

## Coverage

The coverage configuration in `vitest.config.ts` includes:

- `src/lib/**/*.ts` - Utility functions
- `src/db/**/*.ts` - Database operations
- `src/stores/**/*.ts` - Zustand stores
- `src/hooks/**/*.ts` - React hooks
- `src/services/**/*.ts` - Service layer
- `src/components/**/*.tsx` - React components

Coverage reports are generated in the `coverage/` directory.

## Troubleshooting

### Tests timing out

Increase timeout in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 20000, // 20 seconds
}
```

### Module resolution errors

Ensure path aliases are configured in both `tsconfig.json` and `vitest.config.ts`.

### Mock not working

Ensure mocks are defined before imports:

```typescript
// ❌ Wrong order
import { myFunction } from './my-module'
vi.mock('./my-module')

// ✅ Correct order
vi.mock('./my-module')
import { myFunction } from './my-module'
```

### React Testing Library queries not finding elements

Use `debug()` to inspect the rendered output:

```typescript
const { debug } = render(<MyComponent />)
debug() // Prints current DOM to console
```

