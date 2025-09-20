# Mobile Preview Overlay - Chrome Extension

## Project Summary

This Chrome extension helps developers preview web pages in simulated mobile device frames. It provides two main preview modes: an overlay that injects device frames directly into web pages, and a standalone viewer that opens in a new tab. The extension is built for developers who need to test responsive designs across different mobile device dimensions without switching to browser dev tools.

## Tech Stack

- **React 18.3.1** with TypeScript for UI components
- **Vite 5.4.8** with @crxjs/vite-plugin for Chrome extension bundling
- **Tailwind CSS 3.4.13** for styling
- **Chrome Extension Manifest V3** for extension architecture
- **Chrome APIs**: scripting, tabs, downloads, debugger for device emulation

## Main Features / Components

- **Device Preview Overlay** (`src/content/index.tsx`) - Injects mobile device frames into any webpage
- **Extension Popup** (`src/popup/popup.tsx`) - Main control panel with device selection
- **Standalone Viewer** (`src/viewer/viewer.tsx`) - Full-page preview mode for blocked iframes
- **Background Service Worker** (`src/background/index.ts`) - Handles device emulation and message routing
- **Device Definitions** (`src/types/devices.ts`) - Predefined mobile device dimensions

## Architecture / Directory Guide

```
src/
├── background/          # Service worker for Chrome extension APIs
│   └── index.ts        # Message handling, device emulation, debugger API
├── content/            # Content script injected into web pages
│   ├── index.tsx       # Overlay injection and iframe management
│   └── overlay.css     # Styles for mobile preview overlay
├── popup/              # Extension popup UI
│   ├── popup.tsx       # Main control interface
│   ├── main.tsx        # React entry point
│   └── index.html      # Popup HTML template
├── viewer/             # Standalone preview page
│   ├── viewer.tsx      # Full-page device preview
│   ├── main.tsx        # React entry point
│   └── index.html      # Viewer HTML template
├── types/
│   └── devices.ts      # Device type definitions and presets
└── styles/
    └── tailwind.css    # Global Tailwind styles
```

## Data Flow or Request Lifecycle

1. **User clicks extension icon** → Background script injects full overlay UI
2. **User selects device from popup** → Content script receives message → Creates device frame overlay
3. **Overlay mode**: Content script clones page DOM → Injects into iframe with device dimensions
4. **Viewer mode**: Opens new tab with extension page → Loads target URL in iframe
5. **Device emulation**: Background script uses Chrome Debugger API → Applies mobile user agent and touch events
6. **Screenshot capture**: Uses Chrome tabs.captureVisibleTab API → Downloads as PNG

## Conventions & Tips

- **File naming**: Use kebab-case for HTML files, camelCase for TypeScript/React files
- **Styling**: Tailwind CSS classes throughout, with custom CSS only in `overlay.css`
- **Chrome APIs**: All async Chrome API calls wrapped in try-catch blocks
- **Message passing**: Type-safe message interfaces defined for content ↔ background communication
- **Device handling**: Device dimensions stored as numbers, names as strings in `Device` type
- **Build process**: Vite handles React compilation, @crxjs/vite-plugin generates Chrome extension manifest
- **Development**: Use `npm run dev` for hot reload, `npm run build` for production bundle
- **Testing**: Extension requires manual testing in Chrome with developer mode enabled
