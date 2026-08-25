chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current !== "complete" || delta.id === undefined) return;

  const [download] = await chrome.downloads.search({ id: delta.id });
  if (!download?.filename) return;

  const stored = await chrome.storage.local.get({ pendingDownloads: [] });
  const pendingDownloads = Array.isArray(stored.pendingDownloads)
    ? stored.pendingDownloads
    : [];
  pendingDownloads.push({
      id: download.id,
      filename: download.filename,
      url: download.url || "",
      mime: download.mime || "",
      referrer: download.referrer || "",
  });
  await chrome.storage.local.set({ pendingDownloads });

  await chrome.tabs.create({
    url: chrome.runtime.getURL("upload.html"),
    active: true,
  });
});