---
name: Generated Zod compatibility
description: Orval integer schemas require a Zod runtime that supports z.int in this workspace.
---

Use the workspace's Zod 4 catalog when regenerating API schemas that contain OpenAPI integer fields.

**Why:** The generated Zod client emits z.int() for integer schemas, which fails typechecking against the older Zod 3 catalog.

**How to apply:** If API codegen reports that z.int is missing, check the catalog version before editing generated files; regenerate after aligning the runtime version.