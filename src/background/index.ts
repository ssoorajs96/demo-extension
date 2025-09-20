chrome.runtime.onInstalled.addListener(() => {
  // Placeholder for future logic
});

type DeviceMsg = {
  width: number;
  height: number;
  name: string;
};

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === 'switch_to_overlay') {
    const targetUrl: string = msg.url;
    const device: DeviceMsg = msg.device;
    if (!targetUrl || !device) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      const onUpdated = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          chrome.tabs.sendMessage(tabId, { type: 'show_mobile_preview', device });
        }
      };

      chrome.tabs.onUpdated.addListener(onUpdated);
      chrome.tabs.update(tabId, { url: targetUrl });
    });
  }
  if (msg?.type === 'apply_mobile_emulation') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      try {
        await chrome.debugger.attach({ tabId }, '1.3');
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.setEmitTouchEventsForMouse', {
          enabled: true,
          configuration: 'mobile',
        });
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.setUserAgentOverride', {
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
          platform: 'iPhone',
          userAgentMetadata: { platform: 'iOS', platformVersion: '15.0', architecture: '', model: 'iPhone', mobile: true },
        });
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.setTouchEmulationEnabled', { enabled: true });
        await chrome.debugger.detach({ tabId });
        await chrome.tabs.reload(tabId);
      } catch (e) {}
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: openFullOverlay,
    });
  } catch (e) {}
});

function openFullOverlay() {
  const OVERLAY_ID = '__mobile_full_overlay__';
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  const devices = [
    { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852 },
    { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915 },
    { id: 'ipad-10', name: 'iPad 10.9"', width: 820, height: 1180 },
    { id: 'galaxy-s22', name: 'Galaxy S22', width: 360, height: 780 },
  ];

  let current = { ...devices[0] };
  let landscape = false;
  let baseScale = 1; // computed to fit in portrait; reused for landscape
  let interactive = false; // when true, allow scripts inside snapshot iframe

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647; display: grid;
    grid-template-columns: 1fr 300px; gap: 20px; padding: 28px;
    background: #1f2937; /* solid gray-800 */
    font: 500 13px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
    color: #e5e7eb;
  `;

  const stage = document.createElement('div');
  stage.style.cssText = `display:flex; align-items:center; justify-content:center;`;

  const frame = document.createElement('div');
  frame.style.cssText = `
    background:#0b1220;
    border-radius:28px;
    padding:18px;
    box-shadow: 0 25px 80px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,0.03);
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    height:36px; display:flex; align-items:center; justify-content:space-between;
    padding: 0 6px;
  `;
  const title = document.createElement('div');
  title.style.cssText = `
    color:#e5e7eb; letter-spacing:.2px;
  `;
  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.gap = '8px';

  const rotateBtn = document.createElement('button');
  rotateBtn.textContent = 'Rotate';
  rotateBtn.style.cssText = `
    background: linear-gradient(180deg, #374151, #1f2937);
    color:#e5e7eb; border:0; border-radius:8px; min-width:78px; height:30px; cursor:pointer;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 6px 16px rgba(0,0,0,0.25);
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background:#111827;color:#e5e7eb;border:0;border-radius:8px;width:30px;height:30px;cursor:pointer;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset;
  `;

  const interactiveBtn = document.createElement('button');
  interactiveBtn.textContent = 'Interactive';
  interactiveBtn.style.cssText = `
    background: linear-gradient(180deg, #2563eb, #1e3a8a);
    color:#e5e7eb; border:0; border-radius:8px; min-width:98px; height:30px; cursor:pointer;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 6px 16px rgba(0,0,0,0.25);
  `;
  function updateInteractiveLabel() {
    interactiveBtn.textContent = interactive ? 'Interactive: On' : 'Interactive: Off';
  }
  updateInteractiveLabel();
  interactiveBtn.onclick = () => {
    interactive = !interactive;
    updateInteractiveLabel();
    renderSnapshot();
  };

  right.appendChild(interactiveBtn);
  right.appendChild(rotateBtn);
  right.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(right);

  const screen = document.createElement('div');
  screen.style.cssText = `
    margin-top:10px; border:1px solid #0f172a; border-radius:16px; background:white; overflow:hidden; position:relative;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
  `;

  const sidebar = document.createElement('div');
  sidebar.style.cssText = `
    background:#111827; border-radius:20px; padding:16px; display:flex; flex-direction:column; gap:10px;
    align-self:start; height:fit-content; color:#e5e7eb;
    box-shadow: 0 16px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,0.03);
  `;

  const listTitle = document.createElement('div');
  listTitle.textContent = 'Devices';
  listTitle.style.cssText = 'opacity:.9; letter-spacing:.3px; margin-bottom:4px;';
  sidebar.appendChild(listTitle);

  // Emulation controls
  const emulateTitle = document.createElement('div');
  emulateTitle.textContent = 'Emulation';
  emulateTitle.style.cssText = 'opacity:.9; letter-spacing:.3px; margin-top:8px;';
  const emulateBtn = document.createElement('button');
  emulateBtn.textContent = 'Apply Mobile UA + Touch';
  emulateBtn.style.cssText = `
    text-align:center;background:#10b981;color:#062; border:0; border-radius:10px; padding:10px; cursor:pointer;
    color:#062; font-weight:600; background: linear-gradient(180deg,#34d399,#10b981);
  `;
  emulateBtn.onclick = () => {
    try {
      window.postMessage({ __mpo_cmd: 'apply_mobile_emulation' }, '*');
    } catch {}
  };
  sidebar.appendChild(emulateTitle);
  sidebar.appendChild(emulateBtn);

  function setSize() {
    const portraitW = current.width;
    const portraitH = current.height;
    const w = landscape ? current.height : current.width;
    const h = landscape ? current.width : current.height;
    title.textContent = `${current.name} – ${w} × ${h}${landscape ? ' (landscape)' : ''}`;

    // Compute base scale only for portrait to fit to viewport; reuse it in landscape
    if (!landscape) {
      const maxW = Math.max(320, window.innerWidth - 380);
      const maxH = Math.max(240, window.innerHeight - 80);
      baseScale = Math.min(maxW / portraitW, maxH / (portraitH + 40));
    }

    const useScale = baseScale;
    const frameW = Math.floor(w * useScale);
    const frameH = Math.floor((h + 40) * useScale);
    frame.style.width = frameW + 'px';
    frame.style.height = frameH + 'px';
    screen.style.width = Math.floor(w * useScale) + 'px';
    screen.style.height = Math.floor(h * useScale) + 'px';
    renderSnapshot();
    highlightActive();
  }

  function renderSnapshot() {
    // Clear previous
    screen.innerHTML = '';
    let headHtml = document.head ? document.head.innerHTML : '';
    const bodyHtml = document.body ? document.body.innerHTML : '';
    const base = `<base href="${location.href}">`;
    // Inject a mobile viewport meta for responsive layouts
    if (!/name=\"viewport\"/.test(headHtml)) {
      headHtml = `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">` + headHtml;
    }
    // Use thin, subtle scrollbars in snapshot
    headHtml = `<style>html,body{overflow:auto}::selection{background:rgba(0,0,0,.12)}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.25);border-radius:9999px}::-webkit-scrollbar-track{background:transparent}*{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.25) transparent}</style>` + headHtml;
    const html = `<!doctype html><html><head>${base}${headHtml}</head><body>${bodyHtml}</body></html>`;
    const iframe = document.createElement('iframe');
    // Allow interactions; optionally allow scripts if user enabled interactive mode
    const baseSandbox = ['allow-same-origin', 'allow-forms', 'allow-popups', 'allow-top-navigation-by-user-activation'];
    if (interactive) {
      baseSandbox.push('allow-scripts', 'allow-modals', 'allow-pointer-lock', 'allow-popups-to-escape-sandbox');
    }
    iframe.setAttribute('sandbox', baseSandbox.join(' '));
    iframe.srcdoc = html;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    screen.appendChild(iframe);
  }

  const itemEls: HTMLButtonElement[] = [];
  devices.forEach((d) => {
    const item = document.createElement('button');
    item.textContent = `${d.name} (${d.width}×${d.height})`;
    item.style.cssText = `
      text-align:left;background:#0f172a;color:#e5e7eb;border:0;border-radius:10px;padding:10px;cursor:pointer;
      transition: background .15s ease, transform .05s ease; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
    `;
    item.onmouseenter = () => { item.style.background = '#111827'; };
    item.onmouseleave = () => { if (current.id !== d.id) item.style.background = '#0f172a'; };
    item.onclick = () => {
      current = { ...d } as any;
      setSize();
    };
    sidebar.appendChild(item);
    itemEls.push(item);
  });

  function highlightActive() {
    itemEls.forEach((btn, idx) => {
      const d = devices[idx];
      const active = d.id === current.id;
      btn.style.background = active ? '#1f2937' : '#0f172a';
      btn.style.transform = active ? 'scale(1.01)' : 'scale(1)';
    });
  }

  rotateBtn.onclick = () => {
    landscape = !landscape;
    setSize();
  };
  window.addEventListener('resize', () => {
    // Recompute base scale only when in portrait; landscape keeps same scale
    const wasLandscape = landscape;
    if (!wasLandscape) {
      setSize();
    } else {
      // Reapply dimensions with existing baseScale
      const cur = landscape; // keep flag
      setSize();
    }
  });
  closeBtn.onclick = () => overlay.remove();

  frame.appendChild(header);
  frame.appendChild(screen);
  stage.appendChild(frame);
  overlay.appendChild(stage);
  overlay.appendChild(sidebar);
  document.documentElement.appendChild(overlay);

  setSize();
}


