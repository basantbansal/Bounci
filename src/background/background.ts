// Bounci Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Context menu for images
  chrome.contextMenus.create({
    id: 'bounci-squish-image',
    title: 'Squish with Bounci ✨',
    contexts: ['image'],
  });

  // Context menu for page snip
  chrome.contextMenus.create({
    id: 'bounci-snip-area',
    title: 'Snip & Squish page area ✂️',
    contexts: ['page', 'selection'],
  });

  // Context menu to open Studio
  chrome.contextMenus.create({
    id: 'bounci-open-studio',
    title: 'Open Bounci Studio 🎨',
    contexts: ['action'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'bounci-squish-image' && info.srcUrl) {
    try {
      // Ensure content script is ready
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/content.css'],
      }).catch(() => {});

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      }).catch(() => {});

      // Fetch as data URL to bypass any CORS restrictions on image pixels
      const dataUrl = await fetchAsDataUrl(info.srcUrl);
      chrome.tabs.sendMessage(tab.id, {
        type: 'BOUNCI_OPEN_IMAGE',
        imageUrl: dataUrl || info.srcUrl,
      });
    } catch {
      chrome.tabs.sendMessage(tab.id, {
        type: 'BOUNCI_OPEN_IMAGE',
        imageUrl: info.srcUrl,
      });
    }
  } else if (info.menuItemId === 'bounci-snip-area') {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/content.css'],
    }).catch(() => {});

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js'],
    }).catch(() => {});

    chrome.tabs.sendMessage(tab.id, { type: 'BOUNCI_START_SNIP' });
  } else if (info.menuItemId === 'bounci-open-studio') {
    chrome.tabs.create({ url: chrome.runtime.getURL('studio/studio.html') });
  }
});

async function fetchAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Runtime message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'BOUNCI_CAPTURE_TAB') {
    const windowId = sender.tab?.windowId;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Keep message channel open for async response
  }

  if (msg.type === 'BOUNCI_FETCH_IMAGE' && msg.url) {
    fetchAsDataUrl(msg.url)
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch(() => sendResponse({ dataUrl: msg.url }));
    return true;
  }

  if (msg.type === 'BOUNCI_OPEN_STUDIO') {
    if (msg.imageUrl) {
      chrome.storage.local.set({ bounci_studio_image: msg.imageUrl }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('studio/studio.html') });
      });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('studio/studio.html') });
    }
    sendResponse({ ok: true });
  }
});

// Keyboard shortcut commands listener (Alt+Shift+S / Alt+Shift+B)
chrome.commands.onCommand.addListener(async (command) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  if (command === 'snip-area') {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/content.css'],
      }).catch(() => {});

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      }).catch(() => {});

      chrome.tabs.sendMessage(tab.id, { type: 'BOUNCI_START_SNIP' });
    } catch (e) {
      console.warn('Command execution failed:', e);
    }
  } else if (command === 'open-studio') {
    chrome.tabs.create({ url: chrome.runtime.getURL('studio/studio.html') });
  }
});
