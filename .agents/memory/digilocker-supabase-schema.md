---
name: DigiLocker Supabase schema
description: Live database constraints relevant to the browser extension.
---

The DigiLocker Supabase project uses a private `digilocker` Storage bucket and a `public.documents` table keyed by `user_id`; its separate `public.users` table is not automatically the same identity source as Supabase Auth.

**Why:** The initial visual schema was stale and did not describe the live project, so guessed table and bucket names would have silently broken uploads.

**How to apply:** Inspect the live schema before changing extension persistence. Custom login requires an existing server-side auth endpoint or an explicit identity synchronization design; never expose password hashes to browser code.