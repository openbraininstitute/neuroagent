# ESLint and Prettier Configuration

This document describes the linting and formatting setup for the TypeScript backend.

## Overview

The project uses:

- **ESLint** for code quality and consistency checks
- **Prettier** for automatic code formatting

## ESLint Configuration

### Location

`.eslintrc.json`

### Key Rules

#### TypeScript Rules

- `@typescript-eslint/no-explicit-any`: Warn on explicit `any` usage
- `@typescript-eslint/no-unused-vars`: Error on unused variables (with underscore prefix exception)
- `@typescript-eslint/consistent-type-imports`: Enforce consistent type import style
- `@typescript-eslint/no-non-null-assertion`: Warn on non-null assertions

#### Code Quality Rules

- `prefer-const`: Enforce const for variables that are never reassigned
- `no-var`: Disallow var declarations
- `eqeqeq`: Require strict equality (===)
- `curly`: Require curly braces for all control statements
- `prefer-template`: Prefer template literals over string concatenation
- `prefer-arrow-callback`: Prefer arrow functions as callbacks

#### Import Rules

- `import/order`: Enforce consistent import ordering with alphabetization
- `import/no-duplicates`: Prevent duplicate imports

#### React/Next.js Rules

- `react/jsx-curly-brace-presence`: Enforce minimal JSX curly braces
- `react/self-closing-comp`: Enforce self-closing components
- `react-hooks/exhaustive-deps`: Warn on missing hook dependencies

#### Async/Promise Rules

- `no-async-promise-executor`: Disallow async promise executors
- `require-await`: Warn on async functions without await

### Test File Overrides

Test files (`*.test.ts`, `*.test.tsx`, `tests/**/*`) have relaxed rules:

- `@typescript-eslint/no-explicit-any`: Disabled
- `no-console`: Disabled

## Prettier Configuration

### Location

`.prettierrc`

### Settings

- **Semi-colons**: Required (`;`)
- **Quotes**: Single quotes (`'`)
- **Trailing commas**: ES5 compatible
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Arrow parens**: Always include parentheses
- **End of line**: LF (Unix-style)
- **Bracket spacing**: Enabled
- **Bracket same line**: Disabled

## Ignore Files

### `.eslintignore`

Excludes:

- `node_modules`
- Build outputs (`.next`, `out`, `dist`, `build`)
- Coverage reports
- Prisma generated files
- Cache files
- Config files (`next.config.ts`, `vitest.config.ts`)

### `.prettierignore`

Excludes:

- `node_modules`
- Build outputs
- Environment files
- Prisma migrations
- Lock files
- Cache files

## NPM Scripts

### Linting

```bash
# Run ESLint
npm run lint

# Run ESLint with auto-fix
npm run lint:fix
```

### Formatting

```bash
# Check formatting (CI-friendly)
npm run format:check

# Format all files
npm run format
```

### Type Checking

```bash
# Run TypeScript compiler checks
npm run type-check
```

## Workflow

### During Development

1. Write code
2. Save files (editor should auto-format if configured)
3. Run `npm run lint` to check for issues
4. Run `npm run format` to auto-format

### Before Committing

```bash
npm run lint:fix
npm run format
npm run type-check
```

### CI/CD Pipeline

```bash
npm run lint
npm run format:check
npm run type-check
npm run test
```

## Editor Integration

### VS Code

Install extensions:

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"]
}
```

### WebStorm/IntelliJ

1. Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier
3. Enable "Run on save" for both

## Troubleshooting

### ESLint and Prettier Conflicts

The configuration is designed to avoid conflicts. Prettier handles formatting, ESLint handles code quality.

### Import Order Issues

If imports are not ordered correctly, run:

```bash
npm run lint:fix
```

### Formatting Not Applied

Ensure Prettier is installed and the `.prettierrc` file exists:

```bash
npm install --save-dev prettier
```

## Migration Notes

This configuration aligns with:

- Next.js 15+ best practices
- TypeScript strict mode requirements
- Backend Python code style (adapted for TypeScript)
- Frontend code style for consistency

The line length (100 characters) is slightly longer than the Python backend (88) to accommodate TypeScript's more verbose syntax.
