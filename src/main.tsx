/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ClerkProvider } from '@clerk/react';

// Global error listener for debugging
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global Error Caught:", { message, source, lineno, colno, error });
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; color: #991b1b; font-family: sans-serif;">
        <h2>Application Error</h2>
        <p>${message}</p>
        <button onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }
};

const ENV_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const HARDCODED_KEY = 'pk_test_ZnVuLXJheS0xMS5jbGVyay5hY2NvdW50cy5kZXYk';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// If the env key is a secret key (sk_), ignore it and use the hardcoded publishable key
const RAW_KEY = ENV_KEY.startsWith('sk_') ? HARDCODED_KEY : (ENV_KEY || HARDCODED_KEY);
const PUBLISHABLE_KEY = RAW_KEY.replace(/^["']|["']$/g, '').trim();

const isValidKey = PUBLISHABLE_KEY && 
  (PUBLISHABLE_KEY.startsWith('pk_test_') || PUBLISHABLE_KEY.startsWith('pk_live_')) &&
  PUBLISHABLE_KEY.length > 20 &&
  !PUBLISHABLE_KEY.includes('...');

const isGeminiKeyMissing = !GEMINI_KEY || GEMINI_KEY.includes('your_api_key_here');

import { BrowserRouter, useNavigate } from 'react-router-dom';

const ClerkWithRoutes = () => {
  const navigate = useNavigate();
  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl="/"
      localization={{
        signIn: {
          start: {
            title: "Sign in to IntelliServe",
          },
        },
        signUp: {
          start: {
            title: "Sign up to IntelliServe",
          },
        },
      }}
    >
      <App />
    </ClerkProvider>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  if (!isValidKey || isGeminiKeyMissing) {
    createRoot(rootElement).render(
      <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#e11d48', fontSize: '28px', marginBottom: '16px', fontWeight: 'bold' }}>
          {!isValidKey ? 'Invalid Clerk Publishable Key' : 'Missing Gemini API Key'}
        </h1>
        <p style={{ color: '#475569', marginBottom: '32px', fontSize: '18px' }}>
          {!isValidKey 
            ? 'It looks like you accidentally used your Secret Key instead of your Publishable Key.' 
            : 'The application requires a Gemini API Key to power the AI features.'}
        </p>
        <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'left', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          {!isValidKey ? (
            <>
              <p style={{ fontWeight: '600', marginBottom: '16px', color: '#e11d48' }}>Error: You provided a Secret Key ("{ENV_KEY}")</p>
              <p style={{ fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>Please update your Environment Variables in the AI Studio Settings:</p>
              <p style={{ fontWeight: '600', marginBottom: '12px', color: '#0f172a' }}>Change VITE_CLERK_PUBLISHABLE_KEY to:</p>
              <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '20px', borderRadius: '12px', overflowX: 'auto', fontSize: '14px' }}>
pk_test_ZnVuLXJheS0xMS5jbGVyay5hY2NvdW50cy5kZXYk
              </pre>
            </>
          ) : (
            <>
              <p style={{ fontWeight: '600', marginBottom: '16px', color: '#e11d48' }}>Error: Gemini API Key is missing</p>
              <p style={{ fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>Please add your Gemini API Key to the Environment Variables:</p>
              <p style={{ fontWeight: '600', marginBottom: '12px', color: '#0f172a' }}>Key Name: <code>VITE_GEMINI_API_KEY</code></p>
              <p style={{ fontSize: '15px', color: '#64748b' }}>
                You can get your API key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Google AI Studio Dashboard</a>.
              </p>
            </>
          )}
        </div>
      </div>
    );
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <BrowserRouter>
          <ClerkWithRoutes />
        </BrowserRouter>
      </StrictMode>,
    );
  }
}
