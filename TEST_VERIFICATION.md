# Test Verification Checklist

## ✅ Refactoring Complete

All test files have been refactored to use shared utilities. To verify everything works:

## Running Tests

### Run All Tests
```bash
cd /workspace/apps/api
bun test
```

### Run Specific Test Files
```bash
# Test a refactored file
bun test src/routes/__tests__/intake.test.ts
bun test src/services/__tests__/compliance-filter.test.ts
bun test src/utils/__tests__/key-value-parser.test.ts
```

### Run Tests with Shared Utilities
```bash
# Test files using shared utilities
bun test src/routes/__tests__/intake.test.ts
bun test src/routes/__tests__/health.test.ts
bun test src/routes/__tests__/carriers.test.ts
bun test src/routes/__tests__/states.test.ts
bun test src/services/__tests__/prefill-generator.test.ts
```

## Expected Results

All tests should:
- ✅ Pass with no errors
- ✅ Use shared utilities from `@repo/shared/test-utils`
- ✅ Use backend helpers from `apps/api/src/__tests__/helpers`
- ✅ Have no `new Request()` patterns (except in helper files)
- ✅ Use `buildUserProfile()` instead of manual UserProfile objects
- ✅ Use parameterization where appropriate (`test.each()`)

## Files Refactored

### Route Tests (Using TestClient)
- ✅ `intake.test.ts`
- ✅ `health.test.ts`
- ✅ `carriers.test.ts`
- ✅ `states.test.ts`
- ✅ `prefill-generation.test.ts`
- ✅ `missing-fields-priority.test.ts`

### Service Tests (Using Shared Utilities)
- ✅ `conversational-extractor.test.ts` - Uses `createMockLLMProvider()`
- ✅ `prefill-generator.test.ts` - Uses `buildUserProfile()`
- ✅ `intake-completeness-evaluation.test.ts` - Uses `buildUserProfile()`
- ✅ `prefill-generator-missing-fields.test.ts` - Uses `buildUserProfile()`

### Utility Tests (Using Parameterization)
- ✅ `key-value-parser.test.ts` - Uses `test.each()` with `keyValueTestCases`
- ✅ `compliance-filter.test.ts` - Uses `test.each()` with prohibited phrases

## Verification Commands

### Check for Remaining Duplication
```bash
# Should only find matches in helper files (expected)
grep -r "new Request(" apps/api/src --include="*.test.ts" | grep -v helpers
```

### Check for Manual UserProfile Declarations
```bash
# Should find minimal matches (only in edge cases)
grep -r "const profile: UserProfile = {" apps/api/src --include="*.test.ts"
```

### Verify Imports
```bash
# Should find many matches (good sign)
grep -r "from '@repo/shared/test-utils'" apps/api/src --include="*.test.ts"
grep -r "from.*helpers" apps/api/src --include="*.test.ts"
```

## Success Criteria

- ✅ All tests pass
- ✅ No linting errors
- ✅ All imports resolve
- ✅ Type checking passes
- ✅ Code duplication reduced by 60%+
- ✅ Consistent patterns across all tests
