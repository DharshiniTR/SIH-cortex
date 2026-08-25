---
name: Chrome extension file access
description: Browser security constraint affecting automatic uploads from completed downloads.
---

Chrome download events expose metadata and a local path, but an extension cannot silently read arbitrary files from the Downloads folder. A user-approved file picker is required before uploading downloaded content.

**Why:** Allowing silent filesystem reads would let extensions exfiltrate private files, so Chrome blocks the `file://` approach unless the user explicitly grants access.

**How to apply:** For download-to-cloud flows, use the download event to prefill the prompt and require the user to select the file before upload; never claim the path alone is uploadable.