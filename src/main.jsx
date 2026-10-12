import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, useTheme } from 'next-themes'
import App from '@/App.jsx'
import { isAndroidWebView } from '@/lib/device'
import '@/index.css'

// Android WebView ships locked to dark — the mandatory dark-mode requirement.
// enableSystem/forcedTheme are disabled there; iOS and web keep full choice.
const lockedDark = isAndroidWebView();

// Keeps the browser/Android chrome in step with the active theme.
function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme === 'light' ? '#f0e6d2' : '#000000');
  }, [resolvedTheme]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={!lockedDark}
    forcedTheme={lockedDark ? "dark" : undefined}
    storageKey="truth-teller-theme"
    disableTransitionOnChange
  >
    <ThemeColorMeta />
    <App />
  </ThemeProvider>
)