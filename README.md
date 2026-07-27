# ST Universal CORS Bypass

**A universal, 100% client-side frontend extension for SillyTavern and TauriTavern that bypasses CORS restrictions globally.**

This extension monkey-patches the global `window.fetch` function to seamlessly route all external API requests through a public CORS Proxy (defaulting to `corsproxy.io`). 

Because it operates entirely on the frontend by manipulating Javascript's fetch API, it requires **zero Backend installation** and works flawlessly across **all platforms**, including TauriTavern, PC Browsers, Termux (Android), and iOS Safari.

## Features
- **Universal Compatibility:** Works on standard SillyTavern and TauriTavern.
- **100% Client-Side:** No Node.js server plugin installation required. No need to edit `config.yaml`.
- **Global Interception:** Automatically intercepts and proxies any `fetch` calls made by SillyTavern or other extensions (e.g., fetching TTS audio, Wiki text, or external images).
- **Customizable Proxy Server:** Don't want to use `corsproxy.io`? You can easily change the proxy server URL in the extension settings to use your own Cloudflare Worker or alternative proxies like `allorigins.win`.
- **Localhost Safe:** Automatically ignores internal API calls (localhost / 127.0.0.1) to ensure optimal performance and security for your local LLM connections.

## Installation
1. Open SillyTavern and navigate to the **Extensions** menu (the puzzle piece icon).
2. Click **Install Extension** and paste this repository URL:
   `https://github.com/Khanhhpk/st-cors-proxy`
3. Reload SillyTavern.

## Configuration & Usage
Once installed, open the **Extensions** menu and look for **ST Universal CORS Bypass**.
- You will see a green status indicating that the monkey-patch is active.
- **Proxy Server:** You can change the default `https://corsproxy.io/?` to any other CORS proxy service. Just paste the new URL and hit "Save".
- **Test Fetch:** You can paste any CORS-blocked URL (e.g. `https://example.com`) and click Test. The extension will automatically route it through your chosen proxy and display the result.

## Important Privacy Note
Since this extension routes external requests through a public proxy server, you should avoid using it to fetch highly sensitive endpoints if you don't trust the proxy provider. However, standard AI API Keys (like OpenAI or Claude) configured in SillyTavern's core settings are usually routed through the backend or local Rust endpoints (in TauriTavern) and will **not** be intercepted by this proxy.
