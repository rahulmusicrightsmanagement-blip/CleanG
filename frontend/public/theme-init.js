// Apply the saved theme before paint to avoid a light/dark flash.
// External (not inline) so it complies with the strict `script-src 'self'` CSP.
try {
  document.documentElement.setAttribute(
    "data-theme",
    localStorage.getItem("mrm_theme") || "light"
  );
} catch (e) {}
