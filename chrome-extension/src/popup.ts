import { supabase, getSettings } from "./lib/supabase";

const app = document.querySelector<HTMLDivElement>("#app")!;
let mode: "login" | "settings" = "login";

import bcrypt from "bcryptjs";

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
    try {
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      
      const { data: user, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!user) throw new Error("Invalid login credentials (email not found).");
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) throw new Error("Invalid login credentials (wrong password).");
      
      // Store auth session
      await chrome.storage.local.set({ 
        "auth-token": user.id || "fake-jwt", 
        "user-email": user.email,
        "user-name": user.name
      });
      renderSettings();
    } catch (error: any) {
      console.error("Auth error:", error);
      renderLogin(error.message || "Failed to login");
    }
  };
}

async function renderSettings() {
  const stored = await chrome.storage.local.get(["auth-token", "user-email"]);
  if (!stored["auth-token"]) return renderLogin();
  const email = stored["user-email"] || "User";
  const settings = await getSettings();
  mode = "settings";
  app.innerHTML = `
    <div class="row"><div><h2>Connected</h2><p class="muted">${email}</p></div><button id="signout" class="secondary">Sign out</button></div>
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
    await chrome.storage.local.remove(["auth-token", "user-email"]);
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

chrome.storage.local.get("auth-token").then(({ "auth-token": token }) => token ? renderSettings() : renderLogin());