# AI Services Module Refactoring

## Overview

This document describes the refactoring of the AI services module to improve code organization, maintainability, and consistency.

## Goals

1. **Eliminate code duplication**: Remove repeated provider routing and error handling logic
2. **Improve maintainability**: Create clear abstractions for common patterns
3. **Better organization**: Structure code in a logical, hierarchical way
4. **Consistency**: Unified error handling and response formatting

## Changes

### New Core Abstractions

#### 1. Configuration Management (`core/config.ts`)

**Before**: Two separate files (`config-helper.ts` and `provider-selector.ts`) with overlapping responsibilities.

**After**: Single unified configuration module with:
- `getAIServiceConfig()`: Get configuration from settings store
- `selectProvider()`: Auto-select provider based on user status
- `mergeAIServiceConfig()`: Merge user config with defaults

**Benefits**:
- Single source of truth for configuration
- Clearer separation of concerns
- Easier to maintain and test

#### 2. Error Handling (`core/error-handler.ts`)

**Before**: Error handling duplicated in every service file with inconsistent formats.

**After**: Unified error handling utilities:
- `createSuccessResponse()`: Standardized success responses
- `createErrorResponse()`: Standardized error responses
- `handleProviderError()`: Provider-specific error handling
- `withErrorHandling()`: Wrapper for async error handling

**Benefits**:
- Consistent error response format
- Easier to update error handling logic
- Better error messages and debugging

#### 3. Provider Router (`core/provider-router.ts`)

**Before**: Each service file had its own provider routing logic (if/else chains).

**After**: Unified routing abstraction:
- Single `routeToProvider()` function
- Handlers defined per service
- Automatic provider selection
- Consistent error handling

**Benefits**:
- Eliminates code duplication
- Easy to add new providers
- Consistent routing logic
- Better testability

### Service Router Simplification

**Before**: Each service file was 100-170 lines with:
- Complex provider routing logic
- Duplicated error handling
- Inconsistent patterns

**After**: Clean service routers (~80-100 lines):
- Use `routeToProvider()` for routing
- Use `createSuccessResponse()` for responses
- Use `handleProviderError()` for errors
- Focus on service-specific logic only

**Example - ASR Service**:

```typescript
// Before: 165 lines with complex routing
export const asrService = {
  async transcribe(request) {
    const useLocal = request.config?.provider === AIProvider.LOCAL
    const useBYOK = request.config?.provider === AIProvider.BYOK

    if (useLocal) {
      try {
        // ... local logic
        return { success: true, data: ..., metadata: ... }
      } catch (error) {
        return { success: false, error: ..., metadata: ... }
      }
    }
    // ... more complex routing
  }
}

// After: ~80 lines with clear routing
export const asrService = {
  async transcribe(request) {
    try {
      const { response, provider } = await routeToProvider({
        serviceType: AIServiceType.ASR,
        request,
        config: request.config,
        handlers: { local, enjoy, byok, byokAzure },
      })
      return createSuccessResponse(response, AIServiceType.ASR, provider)
    } catch (error) {
      return handleProviderError(error, ERROR_ASR_AZURE, ...)
    }
  }
}
```

### File Organization

**Removed Files**:
- `config-helper.ts` (merged into `core/config.ts`)
- `provider-selector.ts` (merged into `core/config.ts`)

**New Structure**:
```
src/services/ai/
├── core/                    # NEW: Core abstractions
│   ├── config.ts
│   ├── error-handler.ts
│   ├── provider-router.ts
│   └── index.ts
├── types/                   # Existing: Type definitions
├── constants/               # Existing: Constants
├── prompts/                 # Existing: Prompts
├── enjoy/                   # Existing: Provider implementations
├── local/                   # Existing: Provider implementations
├── byok/                    # Existing: Provider implementations
├── asr.ts                   # REFACTORED: Simplified router
├── tts.ts                   # REFACTORED: Simplified router
├── smart-translation.ts     # REFACTORED: Simplified router
├── dictionary.ts            # REFACTORED: Simplified router
├── assessment.ts            # REFACTORED: Simplified router
└── index.ts                 # UPDATED: Exports core module
```

## Migration Guide

### Using Services

No changes required for service consumers. All public APIs remain the same:

```typescript
// Still works as before
const result = await asrService.transcribe({
  audioBlob: blob,
  language: 'en',
  config: { provider: 'local' },
})
```

### Adding New Services

**Before**:
1. Create service file
2. Copy provider routing logic
3. Copy error handling logic
4. Modify for service-specific needs

**After**:
1. Create service file
2. Use `routeToProvider()` with handlers
3. Use `createSuccessResponse()` and `handleProviderError()`

**Example**:
```typescript
export const newService = {
  async doSomething(request: NewRequest) {
    try {
      const { response, provider } = await routeToProvider({
        serviceType: AIServiceType.NEW_SERVICE,
        request,
        config: request.config,
        handlers: {
          local: async (req) => { /* ... */ },
          enjoy: async (req) => { /* ... */ },
          byok: async (req, byokConfig) => { /* ... */ },
        },
      })
      return createSuccessResponse(response, AIServiceType.NEW_SERVICE, provider)
    } catch (error) {
      return handleProviderError(error, ERROR_NEW_SERVICE, ...)
    }
  },
}
```

### Adding New Providers

**Before**: Modify every service file to add provider routing.

**After**: Add handler to `routeToProvider()` in each service (or extend router if pattern is common).

## Benefits

1. **Code Reduction**: ~40% reduction in service router code
2. **Maintainability**: Changes to routing/error handling only need to be made once
3. **Consistency**: All services follow the same pattern
4. **Testability**: Core abstractions can be tested independently
5. **Extensibility**: Easy to add new services or providers

## Backward Compatibility

✅ **Fully backward compatible** - All public APIs remain unchanged. This is a pure internal refactoring.

## Future Improvements

1. **Type Safety**: Improve type inference for `routeToProvider()`
2. **Provider Adapters**: Abstract provider-specific implementations further
3. **Middleware**: Add middleware support for logging, metrics, etc.
4. **Retry Logic**: Add retry logic to core error handler
5. **Caching**: Add caching support at the router level

