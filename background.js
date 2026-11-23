// src/background/background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "bounci-squish-image",
    title: "Squish with Bounci \u2728",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: "bounci-snip-area",
    title: "Snip & Squish page area \u2702\uFE0F",
    contexts: ["page", "selection"]
  });
  chrome.contextMenus.create({
    id: "bounci-open-studio",
    title: "Open Bounci Studio \u{1F3A8}",
    contexts: ["action"]
  });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "bounci-squish-image" && info.srcUrl) {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content/content.css"]
      }).catch(() => {
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/content.js"]
      }).catch(() => {
      });
      const dataUrl = await fetchAsDataUrl(info.srcUrl);
      chrome.tabs.sendMessage(tab.id, {
        type: "BOUNCI_OPEN_IMAGE",
        imageUrl: dataUrl || info.srcUrl
      });
    } catch {
      chrome.tabs.sendMessage(tab.id, {
        type: "BOUNCI_OPEN_IMAGE",
        imageUrl: info.srcUrl
      });
    }
  } else if (info.menuItemId === "bounci-snip-area") {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content/content.css"]
    }).catch(() => {
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/content.js"]
    }).catch(() => {
    });
    chrome.tabs.sendMessage(tab.id, { type: "BOUNCI_START_SNIP" });
  } else if (info.menuItemId === "bounci-open-studio") {
    chrome.tabs.create({ url: chrome.runtime.getURL("studio/studio.html") });
  }
});
async function fetchAsDataUrl(url) {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "BOUNCI_CAPTURE_TAB") {
    const windowId = sender.tab?.windowId;
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true;
  }
  if (msg.type === "BOUNCI_FETCH_IMAGE" && msg.url) {
    fetchAsDataUrl(msg.url).then((dataUrl) => sendResponse({ dataUrl })).catch(() => sendResponse({ dataUrl: msg.url }));
    return true;
  }
  if (msg.type === "BOUNCI_OPEN_STUDIO") {
    if (msg.imageUrl) {
      chrome.storage.local.set({ bounci_studio_image: msg.imageUrl }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("studio/studio.html") });
      });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL("studio/studio.html") });
    }
    sendResponse({ ok: true });
  }
});
chrome.commands.onCommand.addListener(async (command) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;
  if (command === "snip-area") {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content/content.css"]
      }).catch(() => {
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/content.js"]
      }).catch(() => {
      });
      chrome.tabs.sendMessage(tab.id, { type: "BOUNCI_START_SNIP" });
    } catch (e) {
      console.warn("Command execution failed:", e);
    }
  } else if (command === "open-studio") {
    chrome.tabs.create({ url: chrome.runtime.getURL("studio/studio.html") });
  }
});
