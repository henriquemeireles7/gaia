# account

## Purpose
GDPR/privacy endpoints: data export and account deletion.

## Critical Rules
- ALWAYS require auth on all endpoints
- ALWAYS cascade delete ALL user data on account deletion
- NEVER include sensitive fields (password hashes, tokens) in data export

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| privacy.ts | exportUserData, deleteUserAccount |
| routes.ts | accountRoutes |

## Internal Dependencies
- platform/auth
- platform/db
- platform/server
- platform/types
- providers/payments

<!-- Generated: 2026-04-19T04:04:55.787Z -->
