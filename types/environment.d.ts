export {};
declare global {
  namespace Cloudflare {
    // The Vite binding is selected dynamically for Sites vs. the production Worker.
    interface Env { DB: D1Database }
  }
}
