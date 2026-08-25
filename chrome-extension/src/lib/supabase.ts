import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esbnkksbtaikqzalcwhe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_JGX5gZ0BIzjWjTkkhucHEQQ_ipWXxCoz";

const chromeStorage = {
  getItem: async (key: string) => {
    const result = await chrome.storage.local.get(key);
    return (result[key] as string | undefined) ?? null;
  },
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: chromeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getSettings() {
  const result = await chrome.storage.local.get({
    bucket: "digilocker",
    category: "Downloaded document",
  });
  return {
    bucket: String(result.bucket || "digilocker"),
    category: String(result.category || "Downloaded document"),
  };
}