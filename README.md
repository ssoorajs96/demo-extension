## Build and Load

1) Install deps

```bash
npm install
```

2) Dev watch (recommended while iterating)

```bash
npm run dev
```

3) Or production build

```bash
npm run build
```

4) Load into Chrome

- Open `chrome://extensions`
- Enable Developer mode
- Click "Load unpacked" and select the `dist/` folder

## How it works

- Popup is a React app built with Tailwind.
- Content script listens for messages and injects an iframe overlay sized to the selected device.
- Background script is a placeholder for future logic.

