/**
 * Shared OAuth popup: 800×750, centered, dark loading shell.
 */
export function openAuthPopup(name: string): Window | null {
  const width = 800;
  const height = 750;
  const left = Math.max(0, window.screen.width / 2 - width / 2);
  const top = Math.max(0, window.screen.height / 2 - height / 2);
  const popup = window.open(
    "about:blank",
    `${name}_auth`,
    `width=${width},height=${height},top=${top},left=${left},resizable=no,scrollbars=yes`,
  );
  if (popup) {
    try {
      popup.document.write(`
      <html>
        <head><title>Connecting...</title></head>
        <body style="margin:0;display:flex;
          align-items:center;
          justify-content:center;
          height:100vh;
          font-family:-apple-system,sans-serif;
          background:#0f172a;color:white;
          font-size:14px;">
          <div>Loading ${name}...</div>
        </body>
      </html>
    `);
    } catch {
      // Expected after cross-origin redirect
    }
  }
  return popup;
}

/**
 * simPRO OAuth: opens URL directly in an 800×750 centered window (same outer dimensions as other OAuth flows).
 */
export function openSimproOAuthPopup(url: string): Window | null {
  const width = 800;
  const height = 750;
  const left = Math.max(0, window.screen.width / 2 - width / 2);
  const top = Math.max(0, window.screen.height / 2 - height / 2);
  return window.open(
    url,
    "simpro_auth",
    `width=${width},height=${height},top=${top},left=${left},resizable=no,scrollbars=yes`,
  );
}
