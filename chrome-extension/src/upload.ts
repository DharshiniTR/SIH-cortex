import { getSettings, supabase } from "./lib/supabase";

type PendingDownload = { id: number; filename: string; url: string; mime: string; referrer: string };
const app = document.querySelector<HTMLDivElement>("#app")!;

function error(message: string) {
  app.insertAdjacentHTML("beforeend", `<div class="error">${message}</div>`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] || character);
}

async function init() {
  const storedAuth = await chrome.storage.local.get(["auth-token", "user-email"]);
  const token = storedAuth["auth-token"];
  const email = storedAuth["user-email"];
  
  const stored = await chrome.storage.local.get({ pendingDownloads: [] });
  const pendingDownloads = Array.isArray(stored.pendingDownloads)
    ? stored.pendingDownloads as PendingDownload[]
    : [];
  const pending = pendingDownloads[0];
  if (!token || !email) {
    app.innerHTML = `<h1>Sign in required</h1><p>Open the DigiLocker extension and sign in before saving downloads.</p>`;
    return;
  }
  if (!pending) {
    app.innerHTML = `<h1>No pending download</h1><p>This save request has already been handled.</p>`;
    return;
  }

  app.innerHTML = `
    <h1>Save this download?</h1>
    <p>DigiLocker can store a copy in your account for access from the app. Chrome requires you to choose the local file before an extension can upload it.</p>
    <div class="file"><strong>${escapeHtml(pending.filename.split(/[\\/]/).pop() || pending.filename)}</strong><br /><span class="muted">${escapeHtml(email || "")}</span></div>
    <form id="upload-form">
      <label>Downloaded file<input type="file" name="file" required /></label>
      <label>Document name<input name="name" placeholder="e.g. Driving licence" required /></label>
      <label>Document number<input name="identifier" placeholder="e.g. DL-123456" required /></label>
      <button type="submit">Save to DigiLocker</button>
      <button id="skip" type="button" class="secondary">Not now</button>
    </form>
    <div id="status"></div>
  `;
  document.querySelector<HTMLButtonElement>("#skip")!.onclick = async () => {
    await chrome.storage.local.set({ pendingDownloads: pendingDownloads.slice(1) });
    app.innerHTML = `<h1>Download kept local</h1><p>You can close this tab. The file was not added to DigiLocker.</p>`;
  };
  document.querySelector<HTMLFormElement>("#upload-form")!.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const button = document.querySelector<HTMLButtonElement>("#upload-form button")!;
    button.disabled = true;
    button.textContent = "Uploading…";
    try {
      const file = (form.get("file") as File | null);
      if (!file) throw new Error("Choose the downloaded file to continue.");
      const { data: existingDoc } = await supabase
        .from('docs')
        .select('*')
        .eq('email', email)
        .eq('name', String(form.get("name")))
        .maybeSingle();

      if (existingDoc) {
        throw new Error("A document with this name already exists.");
      }

      // Convert file to Base64 Data URL to match the SIH-cortex frontend behavior
      const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      };

      const base64Url = await fileToDataUrl(file);

      const { error: insertErr } = await supabase
        .from('docs')
        .insert([{
            name: String(form.get("name")),
            email: email,
            identifier: String(form.get("identifier")),
            url: base64Url,
            category: 'Government Certificate',
            exported: false
        }]);

      if (insertErr) {
        throw new Error(insertErr.message || "Failed to save document metadata.");
      }

      await chrome.storage.local.set({ pendingDownloads: pendingDownloads.slice(1) });
      app.innerHTML = `<h1>Saved to DigiLocker</h1><p class="success">Your document and its details were added successfully.</p>`;
    } catch (cause) {
      button.disabled = false;
      button.textContent = "Save to DigiLocker";
      error(cause instanceof Error ? cause.message : "The upload failed. Please try again.");
    }
  };
}

void init();