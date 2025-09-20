import React, { useEffect, useMemo, useRef, useState } from 'react';

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function Viewer() {
  const q = useQuery();
  const url = q.get('url') || 'about:blank';
  const width = Number(q.get('w') || 390);
  const height = Number(q.get('h') || 844);
  const name = q.get('name') || 'Device';

  const safeUrl = url.startsWith('http') || url.startsWith('https') ? url : 'about:blank';
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [blocked, setBlocked] = useState(false);

  const capture = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
      const filename = `mobile-preview-${Date.now()}.png`;
      await chrome.downloads.download({ url: dataUrl, filename });
    } catch (e) {
      // noop
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      // If many sites block iframes, auto-fallback to overlay for better UX
      setBlocked(true);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [safeUrl]);

  const fallbackToOverlay = async () => {
    try {
      // Ask background to switch back to the site and inject overlay with this device
      await chrome.runtime.sendMessage({
        type: 'switch_to_overlay',
        url,
        device: { name, width, height },
      });
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-[90vw]">
          <div className="mb-3 text-slate-700 text-sm">
            {name} – {width} × {height}
          </div>
          <div
            className="rounded-2xl p-4 shadow-xl bg-slate-900"
            style={{ width, height }}
          >
            <iframe
              title="mobile-preview"
              className="w-full h-full rounded-xl bg-white border border-slate-800"
              src={safeUrl}
              ref={iframeRef}
            />
          </div>
        </div>
      </div>
      <div className="w-64 border-l bg-white p-4 flex flex-col gap-3">
        <div className="font-medium">Actions</div>
        {blocked && (
          <div className="text-xs text-slate-600">
            This site refuses to load in an iframe. Use overlay mode instead.
          </div>
        )}
        <button
          onClick={capture}
          className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800"
        >
          Capture Screenshot
        </button>
        <button
          onClick={fallbackToOverlay}
          className="px-3 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
        >
          Open as Overlay (Bypass iframe block)
        </button>
      </div>
    </div>
  );
}


