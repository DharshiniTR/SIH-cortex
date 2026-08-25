import { supabase, getSettings } from "./lib/supabase";

const app = document.querySelector<HTMLDivElement>("#app")!;
let mode: "login" | "settings" = "login";

function renderLogin(message = "") {
  app.innerHTML = `
    <h1>Welcome back</h1>
    <p>Sign in to choose DigiLocker as a destination for completed downloads.</p>
    <form id="login">
      <label>Email<input type="email" name="email" autocomplete="email" required /></label>
      <label>Password<input type="password" name="password" autocomplete="current-password" required /></label>
      <button type="submit">Sign in</button>
    </form>
    ${message ? `<div class="error">${message}</div>` : ""}
  `;
  document.querySelector<HTMLFormElement>("#login")!.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const button = document.querySelector<HTMLButtonElement>("#login button")!;
    button.disabled = true;
    button.textContent = "Signing in…";
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) renderLogin(error.message);
    else renderSettings();
  };
}

async function renderSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return renderLogin();
  const settings = await getSettings();
  mode = "settings";
  app.innerHTML = `
    <div class="row"><div><h2>Connected</h2><p class="muted">${user.email}</p></div><button id="signout" class="secondary">Sign out</button></div>
    <div class="divider"></div>
    <h2>Upload settings</h2>
    <p>Choose the Supabase Storage bucket used by your DigiLocker app. The current project bucket is <strong>digilocker</strong>.</p>
    <form id="settings">
      <label>Storage bucket<input name="bucket" value="${settings.bucket}" required /></label>
      <label>Category<input name="category" value="${settings.category}" required /></label>
      <button type="submit">Save settings</button>
    </form>
    <div id="status"></div>
  `;
  document.querySelector<HTMLButtonElement>("#signout")!.onclick = async () => {
    await supabase.auth.signOut();
    mode = "login";
    renderLogin();
  };
  document.querySelector<HTMLFormElement>("#settings")!.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    await chrome.storage.local.set({ bucket: form.get("bucket"), category: form.get("category") });
    document.querySelector("#status")!.innerHTML = `<div class="success">Settings saved.</div>`;
  };
}

supabase.auth.getSession().then(({ data }) => data.session ? renderSettings() : renderLogin());