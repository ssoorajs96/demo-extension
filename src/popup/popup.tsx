import React from 'react';
import { DEVICES, Device } from '../types/devices';

async function injectDeviceFrame(device: Device) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: createDeviceFrame,
      args: [device],
    });
  } catch (error) {
    console.error('Failed to inject device frame:', error);
  }
}

function createDeviceFrame(device: Device) {
  // Remove existing frame if any
  const existing = document.getElementById('__device_frame__');
  if (existing) existing.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = '__device_frame__';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  // Create device frame
  const frame = document.createElement('div');
  frame.style.cssText = `
    background: #1a1a1a;
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    position: relative;
  `;

  // Device header
  const header = document.createElement('div');
  header.style.cssText = `
    color: white;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.textContent = `${device.name} – ${device.width} × ${device.height}`;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: #333;
    border: none;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  `;
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);

  // Device screen
  const screen = document.createElement('div');
  screen.style.cssText = `
    width: ${device.width}px;
    height: ${device.height}px;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
  `;

  // Clone current page content
  const clonedContent = document.documentElement.cloneNode(true) as HTMLElement;
  clonedContent.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    transform-origin: top left;
  `;

  // Scale content to fit device
  const scale = Math.min(device.width / window.innerWidth, device.height / window.innerHeight);
  clonedContent.style.transform = `scale(${scale})`;
  clonedContent.style.width = `${window.innerWidth}px`;
  clonedContent.style.height = `${window.innerHeight}px`;

  screen.appendChild(clonedContent);
  frame.appendChild(header);
  frame.appendChild(screen);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
}

function removeOverlay() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const existing = document.getElementById('__device_frame__');
        if (existing) existing.remove();
      },
    });
  });
}

async function openViewerInThisTab(device: Device) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url || '';
  const url = chrome.runtime.getURL(
    `src/viewer/index.html?name=${encodeURIComponent(device.name)}&w=${device.width}&h=${device.height}&url=${encodeURIComponent(currentUrl)}`
  );
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { url });
  }
}

export default function Popup() {
  return (
    <div className="p-3 space-y-3 bg-slate-50 min-h-full">
      <h1 className="text-lg font-semibold">Mobile Preview</h1>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300"
          onClick={removeOverlay}
        >
          Remove Overlay
        </button>
        <a
          className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300"
          href="https://developer.chrome.com/docs/extensions/"
          target="_blank"
          rel="noreferrer"
        >
          Docs
        </a>
      </div>
      <ul className="grid grid-cols-1 gap-2">
        {DEVICES.map((d) => (
          <li key={d.id}>
            <div className="w-full p-3 rounded border bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-slate-600">{d.width} × {d.height}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 text-xs rounded bg-slate-900 text-white hover:bg-slate-800"
                    onClick={() => injectDeviceFrame(d)}
                  >
                    Overlay
                  </button>
                  <button
                    className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300"
                    onClick={() => openViewerInThisTab(d)}
                  >
                    Viewer
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500">
        Use Overlay for blocked-iframes. Viewer opens an extension page with a frame.
      </p>
    </div>
  );
}


