# blog

## Purpose
Blog/content system powered by markdown files with frontmatter. Provides API routes for listing and reading blog posts. Content lives in `content/posts/`.

## Critical Rules
- NEVER return raw c.json() — use success() or throwError()
- ALWAYS validate slugs (path traversal protection is in the markdown provider)
- NEVER expose draft posts (filtered by markdown provider)

## Imports (use from other modules)
```ts
import { blogRoutes } from '@/features/(shared)/blog/routes'
```

## Recipe: New Blog Post
Create a markdown file in `content/posts/`:
```markdown
---
title: "Post Title"
slug: my-post
description: "Short description"
author: "Author Name"
date: "2026-01-01"
tags: ["tag1", "tag2"]
status: published
---

Post content here...
```

## Verify
```sh
bun test features/\(shared\)/blog/
```

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| routes.ts | blogRoutes |

## Internal Dependencies
- platform/errors
- platform/server
- platform/types
- providers/markdown

<!-- Generated: 2026-04-19T04:04:55.795Z -->
