import './overlay.css';

type Message =
  | { type: 'show_mobile_preview'; device: { width: number; height: number; name: string } }
  | { type: 'hide_mobile_preview' };

const OVERLAY_ID = '__mobile_preview_overlay__';

function createOverlay(width: number, height: number, name: string) {
  // Take a snapshot of the current page to avoid X-Frame-Options/frame-ancestors blocks
  const snapshotHtml = (() => {
    try {
      let headHtml = document.head ? document.head.innerHTML : '';
      const bodyHtml = document.body ? document.body.innerHTML : '';
      const base = `<base href="${location.href}">`;
      // Ensure responsive layout and use thin, subtle scrollbars
      const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
      const scrollbarCss = '<style>html,body{overflow:auto}::selection{background:rgba(0,0,0,.12)}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.25);border-radius:9999px}::-webkit-scrollbar-track{background:transparent}*{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.25) transparent}</style>';
      if (!/name=\"viewport\"/.test(headHtml)) {
        headHtml = viewportMeta + headHtml;
      }
      headHtml = scrollbarCss + headHtml;
      return `<!doctype html><html><head>${base}${headHtml}</head><body>${bodyHtml}</body></html>`;
    } catch {
      return '<!doctype html><html><body><p>Preview unavailable</p></body></html>';
    }
  })();

  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'mpo-overlay';

  const frameContainer = document.createElement('div');
  frameContainer.className = 'mpo-frame';
  frameContainer.style.width = width + 'px';
  frameContainer.style.height = height + 'px';

  const header = document.createElement('div');
  header.className = 'mpo-header';
  header.textContent = name + ' – ' + width + ' × ' + height;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'mpo-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => overlay?.remove());
  header.appendChild(closeBtn);

  const iframe = document.createElement('iframe');
  iframe.className = 'mpo-iframe';
  // Use srcdoc snapshot to avoid anti-framing policies
  iframe.srcdoc = snapshotHtml;
  // Do NOT allow scripts to avoid double-running the page JS
  // iframe.setAttribute('sandbox', 'allow-same-origin allow-forms allow-popups');

  frameContainer.appendChild(header);
  frameContainer.appendChild(iframe);

  const sidebar = document.createElement('div');
  sidebar.className = 'mpo-sidebar';
  const title = document.createElement('div');
  title.textContent = 'Actions';
  title.style.color = '#e5e7eb';
  title.style.fontWeight = '600';
  const captureBtn = document.createElement('button');
  captureBtn.className = 'mpo-button';
  captureBtn.textContent = 'Capture Screenshot';
  captureBtn.addEventListener('click', async () => {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
      const filename = `mobile-preview-${Date.now()}.png`;
      await chrome.downloads.download({ url: dataUrl, filename });
    } catch (e) {}
  });
  sidebar.appendChild(title);
  sidebar.appendChild(captureBtn);

  overlay.appendChild(frameContainer);
  overlay.appendChild(sidebar);
  document.documentElement.appendChild(overlay);
}

function removeOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type === 'hide_mobile_preview') {
    removeOverlay();
    return;
  }
  if (msg.type === 'show_mobile_preview') {
    createOverlay(msg.device.width, msg.device.height, msg.device.name);
  }
});

// Emulation toggle from overlay UI
window.addEventListener('message', async (ev) => {
  if (!ev?.data || ev.data.__mpo_cmd !== 'apply_mobile_emulation') return;
  try {
    await chrome.runtime.sendMessage({ type: 'apply_mobile_emulation' });
  } catch (e) {}
});


