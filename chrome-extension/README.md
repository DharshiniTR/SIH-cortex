# DigiLocker Download Saver

This is a Chrome Manifest V3 extension for the DigiLocker app. It signs users
in with Supabase Auth, watches for completed downloads, and offers to save a
selected downloaded file to Supabase Storage and the existing `docs` table.

## Build and install

```bash
pnpm install
pnpm --filter @workspace/digilocker-extension run build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose
**Load unpacked**, and select the `chrome-extension/dist` directory.

## Supabase assumptions

- Supabase Auth is enabled for email/password sign-in.
- The Storage bucket configured in the extension exists. The default is
  `documents`; change it from the extension popup if needed.
- The authenticated user is allowed by RLS to insert their own email into
  `docs` and upload beneath their own user ID.
- The `docs` table has the fields `name`, `email`, `identifier`, `url`,
  `category`, and `exported`, matching the provided schema.

The extension uses only the publishable Supabase client key. Never put a
service-role key in a browser extension.

## Chrome file access limitation

Chrome does not allow an extension to silently read arbitrary files from a
user's Downloads folder. After a download completes, the extension opens a
save screen with the download details and a file picker. The user must select
the downloaded file before upload, which is the browser-approved flow.