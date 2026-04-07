# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Auth (Clerk)

- Clerk auth is integrated with email + Google sign-in
- First registered user is automatically promoted to Admin + Premium tier
- All other users start on Free tier
- Admin panel: `/admin` — view all users, upgrade/downgrade tiers
- User tier stored in `users` table: `clerkId`, `email`, `tier` (free/premium), `isAdmin`
- API routes: `GET /api/users/me`, `POST /api/users/me/sync`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/tier`

## MailDrop Features

- Domains: `weyn.store`, `jhames.shop` (via Hanami.run webhooks)
- Real-time SSE: `/api/events` broadcasts `new-email` on webhook arrival
- Free tier: demo inbox with OTP preview
- Premium tier: full inbox access on both domains
- Admin: can manage user tiers via `/admin` page
