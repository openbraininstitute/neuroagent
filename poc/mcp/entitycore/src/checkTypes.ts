import { InferredGetBrainRegionsQueryParams } from './zodSchemas.js'; // Ensure .js extension for ES Modules
import { operations } from './types.js'; // Ensure .js extension if types.d.ts is compiled or treated as a module

// Type for the query parameters from types.d.ts
// We use NonNullable because the 'query' object itself is optional in the 'parameters' type,
// but we are interested in the structure *within* the query object if it exists.
type OpenApiBrainRegionQueryParams = NonNullable<operations['read_many_brain_region_get']['parameters']['query']>;

// Compile-time type equality check helper.
// This utility type evaluates to `true` if X and Y are structurally identical and
// mutually assignable, otherwise it evaluates to `false` or a type that causes an error
// when assigned to `true`.
type AreTypesStructurallyEqual<X, Y> =
    [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;

// Perform the compile-time check.
// The variable 'check' is typed as 'true'. If 'AreTypesStructurallyEqual' evaluates to 'false'
// (or any type other than 'true'), the assignment will cause a TypeScript compilation error.
const check: AreTypesStructurallyEqual<InferredGetBrainRegionsQueryParams, OpenApiBrainRegionQueryParams> = true;

// If the script compiles up to this point without errors from the 'check' assignment,
// it means the types are considered structurally identical by TypeScript.
// The console log is mostly for confirmation when running the compiled JS,
// the primary check is the compile-time success.
if (check === true) { // check will always be true if compilation succeeds
    console.log("SUCCESS: Zod-inferred type for GetBrainRegionsParams is structurally identical to the OpenAPI-generated type.");
}

/*
How to use this script:

1.  Save this code as `checkTypes.ts` in your `poc/mcp/entitycore/src/` directory.
2.  Ensure you have TypeScript (`typescript` package) installed in your project
    (usually as a dev dependency in `package.json`) or installed globally.
3.  You can then compile this file as part of your build process or check it individually:
    `npx tsc --noEmit poc/mcp/entitycore/src/checkTypes.ts`
    (or `tsc --noEmit poc/mcp/entitycore/src/checkTypes.ts` if tsc is in your PATH).

    The `--noEmit` flag tells TypeScript to perform all checks but not produce JavaScript output files,
    which is ideal for a type-checking script.

4.  If there are any structural mismatches between `InferredGetBrainRegionsQueryParams` and
    `OpenApiBrainRegionQueryParams`, the TypeScript compiler (`tsc`) will output errors
    during this command, pointing to the line with the `const check: ...` assignment.
    If the command completes without errors, the types are structurally compatible.
*/
