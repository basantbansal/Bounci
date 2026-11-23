"use strict";
(() => {
  // src/content/sniper.ts
  function startSniper(onComplete, onCancel) {
    const existing = document.getElementById("bounci-sniper-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "bounci-sniper-overlay";
    overlay.className = "bounci-sniper-veil";
    const hint = document.createElement("div");
    hint.className = "bounci-sniper-hint";
    hint.textContent = "\u2702\uFE0F Click and drag to snip squishy region (Esc to cancel)";
    overlay.appendChild(hint);
    const box = document.createElement("div");
    box.className = "bounci-sniper-box";
    box.style.display = "none";
    overlay.appendChild(box);
    const badge = document.createElement("div");
    badge.className = "bounci-sniper-badge";
    box.appendChild(badge);
    document.body.appendChild(overlay);
    let isDown = false;
    let startX = 0;
    let startY = 0;
    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cleanup();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    overlay.addEventListener("pointerdown", (e) => {
      isDown = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = "0px";
      box.style.height = "0px";
      box.style.display = "block";
      overlay.setPointerCapture(e.pointerId);
    });
    overlay.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const curX = e.clientX;
      const curY = e.clientY;
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
      badge.textContent = `${w} \xD7 ${h}`;
    });
    overlay.addEventListener("pointerup", (e) => {
      if (!isDown) return;
      isDown = false;
      const curX = e.clientX;
      const curY = e.clientY;
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      cleanup();
      if (w > 15 && h > 15) {
        onComplete({ x, y, w, h });
      } else {
        onCancel?.();
      }
    });
  }

  // src/content/content.ts
  var activeWidget = null;
  var widgetX = 0;
  var widgetY = 0;
  var pendingDx = 0;
  var pendingDy = 0;
  var rafMoveId = null;
  function applyWidgetPosition() {
    if (!activeWidget) return;
    widgetX += pendingDx;
    widgetY += pendingDy;
    pendingDx = 0;
    pendingDy = 0;
    const w = activeWidget.offsetWidth || 300;
    const h = activeWidget.offsetHeight || 220;
    widgetX = Math.max(-w + 80, Math.min(widgetX, window.innerWidth - 80));
    widgetY = Math.max(0, Math.min(widgetY, window.innerHeight - 40));
    activeWidget.style.transform = `translate3d(${Math.round(widgetX)}px, ${Math.round(widgetY)}px, 0)`;
    rafMoveId = null;
  }
  function removeFloatingWidget() {
    if (rafMoveId) {
      cancelAnimationFrame(rafMoveId);
      rafMoveId = null;
    }
    if (activeWidget) {
      activeWidget.remove();
      activeWidget = null;
    }
  }
  function spawnFloatingWidget(imageUrl, preferredRect) {
    removeFloatingWidget();
    const container = document.createElement("div");
    container.id = "bounci-floating-widget";
    const defaultW = Math.min(480, window.innerWidth * 0.85);
    const defaultH = Math.min(380, window.innerHeight * 0.75);
    let w = preferredRect?.w ?? defaultW;
    let h = preferredRect ? preferredRect.h + 50 : defaultH;
    w = Math.max(280, Math.min(w, window.innerWidth - 40));
    h = Math.max(220, Math.min(h, window.innerHeight - 40));
    widgetX = preferredRect ? preferredRect.x : (window.innerWidth - w) / 2;
    widgetY = preferredRect ? Math.max(10, preferredRect.y - 25) : (window.innerHeight - h) / 2;
    widgetX = Math.max(10, Math.min(widgetX, window.innerWidth - w - 10));
    widgetY = Math.max(10, Math.min(widgetY, window.innerHeight - h - 10));
    pendingDx = 0;
    pendingDy = 0;
    container.style.width = `${Math.round(w)}px`;
    container.style.height = `${Math.round(h)}px`;
    container.style.transform = `translate3d(${Math.round(widgetX)}px, ${Math.round(widgetY)}px, 0)`;
    const iframe = document.createElement("iframe");
    const overlayUrl = chrome.runtime.getURL("overlay/overlay.html");
    iframe.src = `${overlayUrl}?fit=1.0`;
    iframe.addEventListener("load", () => {
      iframe.contentWindow?.postMessage({ type: "BOUNCI_LOAD_IMAGE", imageUrl }, "*");
    });
    container.appendChild(iframe);
    document.body.appendChild(container);
    activeWidget = container;
  }
  window.addEventListener("message", (e) => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "BOUNCI_CLOSE") {
      removeFloatingWidget();
    } else if (e.data.type === "BOUNCI_DRAG_START") {
      activeWidget?.classList.add("bounci-dragging");
    } else if (e.data.type === "BOUNCI_DRAG_END") {
      activeWidget?.classList.remove("bounci-dragging");
      if (pendingDx !== 0 || pendingDy !== 0) {
        applyWidgetPosition();
      }
    } else if (e.data.type === "BOUNCI_MOVE" && activeWidget) {
      pendingDx += e.data.dx || 0;
      pendingDy += e.data.dy || 0;
      if (!rafMoveId) {
        rafMoveId = requestAnimationFrame(applyWidgetPosition);
      }
    } else if (e.data.type === "BOUNCI_OPEN_STUDIO") {
      chrome.runtime.sendMessage({ type: "BOUNCI_OPEN_STUDIO" });
    }
  });
  async function cropScreenshot(dataUrl, rect) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scaleX = img.naturalWidth / window.innerWidth;
        const scaleY = img.naturalHeight / window.innerHeight;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(rect.w * scaleX));
        canvas.height = Math.max(1, Math.round(rect.h * scaleY));
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          img,
          rect.x * scaleX,
          rect.y * scaleY,
          rect.w * scaleX,
          rect.h * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  }
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "BOUNCI_OPEN_IMAGE") {
      spawnFloatingWidget(msg.imageUrl);
      sendResponse({ ok: true });
    } else if (msg.type === "BOUNCI_START_SNIP") {
      startSniper(async (rect) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            chrome.runtime.sendMessage({ type: "BOUNCI_CAPTURE_TAB" }, async (res) => {
              if (res?.dataUrl) {
                const cropped = await cropScreenshot(res.dataUrl, rect);
                spawnFloatingWidget(cropped, rect);
              }
            });
          });
        });
      });
      sendResponse({ ok: true });
    }
    return true;
  });
})();
