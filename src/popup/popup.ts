// Bounci Popup Script

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css'],
    }).catch(() => {});

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js'],
    }).catch(() => {});
  } catch (e) {
    console.warn('Script injection failed (special Chrome page):', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const btnSnip = document.getElementById('btnSnip');
  const btnStudio = document.getElementById('btnStudio');
  const btnSample = document.getElementById('btnSample');
  const btnSound = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const slider = document.getElementById('softnessSlider') as HTMLInputElement;
  const softnessVal = document.getElementById('softnessVal');

  // Load preferences from storage
  chrome.storage.local.get(['bounci_softness', 'bounci_muted'], (res) => {
    if (res.bounci_softness !== undefined && slider && softnessVal) {
      slider.value = String(res.bounci_softness);
      softnessVal.textContent = `${Math.round(res.bounci_softness * 100)}%`;
    }
    if (res.bounci_muted && soundIcon && btnSound) {
      soundIcon.textContent = '🔇';
      btnSound.classList.add('muted');
    }
  });

  slider?.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    if (softnessVal) softnessVal.textContent = `${Math.round(val * 100)}%`;
    chrome.storage.local.set({ bounci_softness: val });
  });

  btnSound?.addEventListener('click', () => {
    chrome.storage.local.get(['bounci_muted'], (res) => {
      const muted = !res.bounci_muted;
      chrome.storage.local.set({ bounci_muted: muted });
      if (soundIcon) soundIcon.textContent = muted ? '🔇' : '🔊';
      btnSound.classList.toggle('muted', muted);
    });
  });

  // 1. Snip Page Area
  btnSnip?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    await ensureContentScriptInjected(tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'BOUNCI_START_SNIP' });
    window.close();
  });

  // 2. Open Studio
  btnStudio?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('studio/studio.html') });
    window.close();
  });

  // 3. Try Sample
  btnSample?.addEventListener('click', async () => {
    const sampleUrl = chrome.runtime.getURL('sample.svg');
    chrome.storage.local.set({ bounci_studio_image: sampleUrl }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('studio/studio.html') });
      window.close();
    });
  });
});
