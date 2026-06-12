import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './brokerage-arc-graph';

// In production the platform injects SFDC_ENV. For local dev use ?recordId=.
const sfdcEnv = globalThis.SFDC_ENV ?? {};
const params = new URLSearchParams(window.location.search);
const recordId = sfdcEnv.recordId ?? params.get('recordId') ?? params.get('id') ?? null;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App recordId={recordId} />
  </StrictMode>
);
