# ST Tauri CORS Bypass

**A specialized frontend extension for SillyTavern designed exclusively for Tauri Tavern.**

This extension monkey-patches the global `window.fetch` function to seamlessly route all external API requests through Tauri's native Rust HTTP client (`window.__TAURI__.http`). 

By intercepting requests at the frontend layer and utilizing Tauri's native capabilities, this extension completely bypasses browser CORS restrictions without requiring any Node.js backend modifications, server plugins, or `config.yaml` edits.

## Features
- **100% Client-Side:** No server plugin installation required.
- **Global Interception:** Automatically intercepts and proxies any `fetch` calls made by SillyTavern or other extensions.
- **Zero Configuration:** Just install and reload. It works silently in the background.
- **Localhost Safe:** Automatically ignores internal API calls (localhost / 127.0.0.1) to ensure optimal performance.

## Installation
1. Open SillyTavern and navigate to the **Extensions** menu (the puzzle piece icon).
2. Click **Install Extension** and paste this repository URL:
   `https://github.com/Khanhhpk/st-cors-proxy`
3. Reload SillyTavern.

## How it works
When installed in Tauri Tavern, the extension detects the presence of `window.__TAURI__.http.fetch`. It overwrites the standard browser `fetch` API. Any outgoing request to an external domain is caught, translated into Tauri's fetch format, sent via the Rust backend (which ignores CORS), and repackaged back into a standard Web API `Response` object for SillyTavern to consume transparently.

## Requirements
- **Tauri Tavern**: This extension will **NOT** work on standard web browsers (Chrome, Firefox, Safari) or Termux because they lack the `window.__TAURI__` environment. If you are using a standard browser, please use a browser-based CORS extension (like "Allow CORS: Access-Control-Allow-Origin") or Quetta browser.
