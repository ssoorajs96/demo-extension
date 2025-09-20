import React from 'react';
import { createRoot } from 'react-dom/client';
import Viewer from './viewer';
import '../styles/tailwind.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Viewer />
    </React.StrictMode>
  );
}

