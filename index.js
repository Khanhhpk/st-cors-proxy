(function () {
    const EXTENSION_NAME = 'st-universal-cors-bypass';
    const SETTINGS_KEY = 'st-cors-bypass-url';
    const DEFAULT_PROXY = 'https://corsproxy.io/?';

    if (typeof window === 'undefined') return;

    function getProxyUrl() {
        return localStorage.getItem(SETTINGS_KEY) || DEFAULT_PROXY;
    }

    jQuery(async () => {
        console.log(`[${EXTENSION_NAME}] Khởi động hệ thống đánh chặn Fetch toàn cầu...`);
        setupMonkeyPatch();
        initUI();
    });

    function setupMonkeyPatch() {
        const originalFetch = window.fetch;

        window.fetch = async function (resource, options = {}) {
            let url = resource;
            
            if (resource instanceof Request) {
                url = resource.url;
                options.method = options.method || resource.method;
                options.headers = options.headers || resource.headers;
                options.body = options.body || resource.body;
                options.mode = options.mode || resource.mode;
                options.credentials = options.credentials || resource.credentials;
            }

            const activeProxy = getProxyUrl();

            // Chỉ bắt các request có chữ HTTP (ra ngoài internet)
            // Và BỎ QUA localhost, 127.0.0.1 (API nội bộ của ST)
            if (typeof url === 'string' && url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.startsWith(activeProxy)) {
                
                let proxiedUrl = activeProxy + encodeURIComponent(url);
                
                // Hỗ trợ allorigins.win (nó dùng ?url=)
                if (activeProxy.includes('allorigins.win')) {
                    if (!activeProxy.endsWith('url=')) {
                        proxiedUrl = activeProxy + (activeProxy.includes('?') ? '&url=' : '?url=') + encodeURIComponent(url);
                    } else {
                        proxiedUrl = activeProxy + encodeURIComponent(url);
                    }
                }
                
                console.log(`[${EXTENSION_NAME}] Bẻ lái Fetch: ${url} -> ${proxiedUrl}`);

                try {
                    return await originalFetch.call(this, proxiedUrl, options);
                } catch (error) {
                    console.error(`[${EXTENSION_NAME}] Lỗi khi đi qua Proxy: ${url}. Fallback về mặc định. Lỗi:`, error);
                    return originalFetch.apply(this, arguments);
                }
            }

            return originalFetch.apply(this, arguments);
        };
        console.log(`[${EXTENSION_NAME}] ✅ Đã ghi đè window.fetch! Toàn bộ request đã được gắn khiên chống CORS.`);
    }

    async function initUI() {
        try {
            const container = document.getElementById('extensions_settings');
            if (!container) {
                setTimeout(initUI, 1000);
                return;
            }

            if (document.getElementById('st-tauri-cors-bypass-settings')) return;

            const currentProxy = getProxyUrl();

            const uiHtml = `
            <div class="extension_settings" id="st-tauri-cors-bypass-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>ST Universal CORS Bypass</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container alignitemscenter margin-bot-10px">
                            <span style="margin-right: 10px;">Trạng thái hệ thống:</span>
                            <b id="st-tauri-cors-status" style="color: lightgreen;">✅ Đang hoạt động (Monkey-Patch OK)</b>
                        </div>
                        
                        <p style="font-size: 0.85em; opacity: 0.8; margin-bottom: 10px;">
                            Hệ thống đã tự động ghi đè <b>window.fetch</b>. Hoạt động 100% trên cả <b>SillyTavern gốc</b> và <b>TauriTavern</b>.
                        </p>

                        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
                        
                        <div style="font-weight: bold; margin-bottom: 5px;">⚙️ Máy chủ Proxy (CORS Proxy URL)</div>
                        <p style="font-size: 0.8em; opacity: 0.8; margin-bottom: 5px;">
                            ⚠️ <b>Lưu ý:</b> <code>corsproxy.io</code> giới hạn <b>60 request/phút</b> và CHỈ tải được Text/JSON. Nếu cần tải Ảnh/Âm thanh, hãy chọn nguồn khác.
                        </p>
                        
                        <div class="flex-container margin-bot-10px" style="gap: 5px; flex-direction: column;">
                            <select id="st-tauri-cors-preset-select" class="text_pole" style="width: 100%; padding: 5px; cursor: pointer;">
                                <option value="">-- Chọn Proxy cài sẵn (Mì ăn liền) --</option>
                                <option value="https://corsproxy.io/?">corsproxy.io (Mặc định - Chỉ Text)</option>
                                <option value="https://api.allorigins.win/raw?url=">AllOrigins (Ngon - Hỗ trợ Media)</option>
                                <option value="https://cors-anywhere.com/">cors-anywhere.com (Cộng đồng)</option>
                                <option value="https://cors-anywhere.herokuapp.com/">cors-anywhere.herokuapp (Cần Unlock)</option>
                            </select>
                            
                            <div class="flex-container" style="gap: 5px;">
                                <input type="text" id="st-tauri-cors-settings-url" class="text_pole" style="flex: 1;" value="${currentProxy}" placeholder="Hoặc nhập Proxy tùy chỉnh...">
                                <div id="st-tauri-cors-save-btn" class="menu_button" style="white-space: nowrap;">Lưu Cấu Hình</div>
                            </div>
                        </div>

                        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
                        
                        <div style="font-weight: bold; margin-bottom: 5px;">🧪 Kiểm tra (Test Bypass)</div>
                        <div class="flex-container margin-bot-10px">
                            <input type="text" id="st-tauri-cors-url" class="text_pole" style="flex: 1;" placeholder="https://example.com" value="https://example.com">
                            <div id="st-tauri-cors-test-btn" class="menu_button">Test Fetch</div>
                        </div>

                        <div style="margin-top: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px;">Mã nguồn trả về:</div>
                            <textarea id="st-tauri-cors-raw" class="text_pole" style="width: 100%; height: 150px; font-family: monospace; font-size: 0.85em; resize: vertical; display: none;" readonly></textarea>
                        </div>
                    </div>
                </div>
            </div>`;
            
            $(container).append(uiHtml);

            // Save Settings
            const saveBtn = $('#st-tauri-cors-save-btn');
            const settingsInput = $('#st-tauri-cors-settings-url');
            
            // Preset Select
            $('#st-tauri-cors-preset-select').on('change', function() {
                const val = $(this).val();
                if (val) {
                    settingsInput.val(val);
                    if (val === 'https://cors-anywhere.herokuapp.com/') {
                        if (confirm("Lưu ý: Máy chủ này yêu cầu bạn phải được cấp quyền (Unlock) trước khi dùng.\n\nBạn có muốn mở trang web lấy quyền (corsdemo) ngay bây giờ không?")) {
                            window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank');
                        }
                    }
                }
            });

            saveBtn.on('click', () => {
                let val = settingsInput.val().trim();
                if (!val) {
                    val = DEFAULT_PROXY;
                    settingsInput.val(val);
                }
                localStorage.setItem(SETTINGS_KEY, val);
                
                const oldText = saveBtn.text();
                saveBtn.text('Đã Lưu!').css('background', 'rgba(16, 185, 129, 0.4)');
                setTimeout(() => {
                    saveBtn.text(oldText).css('background', '');
                }, 2000);
            });

            // Test Fetch
            const testBtn = $('#st-tauri-cors-test-btn');
            const testInput = $('#st-tauri-cors-url');
            const testRawOutput = $('#st-tauri-cors-raw');

            testBtn.on('click', async () => {
                let url = testInput.val().trim();
                if (!url) return;
                if (!url.startsWith('http')) url = 'https://' + url;

                testBtn.text('Đang tải...').css('pointer-events', 'none').css('opacity', '0.5');
                testRawOutput.hide();

                try {
                    const res = await fetch(url, { method: "GET" });
                    const text = await res.text();
                    testRawOutput.val(text).show();
                } catch (e) {
                    testRawOutput.val(`❌ Lỗi: ${e.message}`).show();
                } finally {
                    testBtn.text('Test Fetch').css('pointer-events', 'auto').css('opacity', '1');
                }
            });

        } catch (error) {
            console.error(`[${EXTENSION_NAME}] Lỗi khởi tạo UI:`, error);
        }
    }
})();
