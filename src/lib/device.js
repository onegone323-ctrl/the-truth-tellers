// Android WebView detection: the WebView user agent carries the "; wv)"
// token, and very old WebView builds ship Android without any Chrome/ token.
export function isAndroidWebView() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /;\s*wv\)/.test(ua) || (/Android/.test(ua) && !/Chrome\/|Chromium\//.test(ua));
}