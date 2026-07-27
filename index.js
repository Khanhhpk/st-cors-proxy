(function () {
    const EXTENSION_NAME = 'st-universal-cors-bypass';
    const SETTINGS_URL_KEY = 'st-cors-bypass-url';
    const SETTINGS_ENABLED_KEY = 'st-cors-bypass-enabled';
    const SETTINGS_BLACKLIST_KEY = 'st-cors-bypass-blacklist';
    const DEFAULT_PROXY = 'https://corsproxy.io/?';

    if (typeof window === 'undefined') return;

    let interceptLogs = [];

    function getProxyUrl() {
        return localStorage.getItem(SETTINGS_URL_KEY) || DEFAULT_PROXY;
    }

    function isSystemEnabled() {
        return localStorage.getItem(SETTINGS_ENABLED_KEY) !== 'false';
    }

    function setSystemEnabled(enabled) {
        localStorage.setItem(SETTINGS_ENABLED_KEY, enabled ? 'true' : 'false');
    }

    function getBlacklist() {
        const raw = localStorage.getItem(SETTINGS_BLACKLIST_KEY) || '';
        return raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }

    function addLog(status, url) {
        const time = new Date().toLocaleTimeString();
        interceptLogs.unshift(`[${time}] [${status}] ${url}`);
        if (interceptLogs.length > 30) interceptLogs.pop(); // Keep last 30
        
        const logBox = document.getElementById('st-tauri-cors-logs');
        if (logBox) {
            logBox.value = interceptLogs.join('\n');
        }
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
            const enabled = isSystemEnabled();

            if (enabled && typeof url === 'string' && url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
                // Kiểm tra proxy vòng lặp
                if (!url.startsWith(activeProxy)) {
                    // Kiểm tra Blacklist
                    const blacklist = getBlacklist();
                    const isBlacklisted = blacklist.some(item => url.includes(item));

                    if (isBlacklisted) {
                        addLog('BỎ QUA (Blacklist)', url);
                        return originalFetch.apply(this, arguments);
                    }

                    // Tiến hành đánh chặn
                    let proxiedUrl;
                    
                    if (activeProxy.includes('cors-anywhere')) {
                        // Dòng cors-anywhere không chấp nhận URL bị mã hóa, nó cần URL gốc ghép vào
                        proxiedUrl = activeProxy + url;
                    } else {
                        // corsproxy.io và các proxy khác dùng tham số (hoặc đường dẫn) cần mã hóa an toàn
                        proxiedUrl = activeProxy + encodeURIComponent(url);
                    }
                    
                    addLog('ĐÃ BẺ LÁI', url);
                    
                    try {
                        return await originalFetch.call(this, proxiedUrl, options);
                    } catch (error) {
                        addLog('LỖI PROXY', url);
                        console.error(`[${EXTENSION_NAME}] Lỗi proxy tại URL: ${url}`, error);
                        return originalFetch.apply(this, arguments);
                    }
                }
            }

            // Nếu hệ thống tắt hoặc URL nội bộ, chạy bình thường
            return originalFetch.apply(this, arguments);
        };
        console.log(`[${EXTENSION_NAME}] ✅ Đã ghi đè window.fetch!`);
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
            const isEnabled = isSystemEnabled();
            const currentBlacklist = localStorage.getItem(SETTINGS_BLACKLIST_KEY) || '';

            const uiHtml = `
            <div class="extension_settings" id="st-tauri-cors-bypass-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>ST Universal CORS Bypass</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        
                        <div class="flex-container alignitemscenter margin-bot-10px">
                            <span style="margin-right: 10px; font-weight: bold;">Công tắc Hệ thống:</span>
                            <label class="checkbox_label">
                                <input type="checkbox" id="st-tauri-cors-toggle" ${isEnabled ? 'checked' : ''}>
                                <span>Kích hoạt đánh chặn CORS</span>
                            </label>
                        </div>
                        <p style="font-size: 0.8em; opacity: 0.8; margin-bottom: 10px;">
                            Bật/tắt toàn bộ hệ thống bẻ lái fetch gốc (Monkey-Patch).
                        </p>

                        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
                        
                        <div style="font-weight: bold; margin-bottom: 5px;">⚙️ Máy chủ Proxy (CORS Proxy URL)</div>
                        <p style="font-size: 0.8em; opacity: 0.8; margin-bottom: 5px;">
                            ⚠️ <b>Lưu ý:</b> Các Proxy miễn phí như <code>corsproxy.io</code> có giới hạn (ví dụ: <b>60 request/phút</b>).
                        </p>
                        
                        <div class="flex-container margin-bot-10px" style="gap: 5px; flex-direction: column;">
                            <select id="st-tauri-cors-preset-select" class="text_pole" style="width: 100%; padding: 5px; cursor: pointer;">
                                <option value="">-- Chọn Proxy cài sẵn (Mì ăn liền) --</option>
                                <option value="https://corsproxy.io/?">corsproxy.io (Mặc định - Chỉ Text)</option>
                                <option value="https://cors-anywhere.com/">cors-anywhere.com (Cộng đồng)</option>
                                <option value="https://cors-anywhere.herokuapp.com/">cors-anywhere.herokuapp (Cần Unlock)</option>
                            </select>
                            
                            <div class="flex-container" style="gap: 5px;">
                                <input type="text" id="st-tauri-cors-settings-url" class="text_pole" style="flex: 1;" value="${currentProxy}" placeholder="Hoặc nhập Proxy tùy chỉnh...">
                                <div id="st-tauri-cors-save-btn" class="menu_button" style="white-space: nowrap;">Lưu Cấu Hình</div>
                            </div>
                        </div>

                        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">

                        <div style="font-weight: bold; margin-bottom: 5px;">🛡️ Danh sách đen (Blacklist)</div>
                        <p style="font-size: 0.8em; opacity: 0.8; margin-bottom: 5px;">
                            Các URL có chứa từ khóa dưới đây sẽ KHÔNG BỊ CAN THIỆP (mỗi từ khóa 1 dòng). Dùng cho các API đã có sẵn CORS hoặc các nguồn bạn không muốn đi qua Proxy.
                        </p>
                        <textarea id="st-tauri-cors-blacklist" class="text_pole" style="width: 100%; height: 80px; font-family: monospace; font-size: 0.85em; resize: vertical;" placeholder="Ví dụ:
openai.com
api.anthropic.com">${currentBlacklist}</textarea>

                        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">

                        <div style="font-weight: bold; margin-bottom: 5px;">📜 Nhật ký Can thiệp (Logs)</div>
                        <textarea id="st-tauri-cors-logs" class="text_pole" style="width: 100%; height: 120px; font-family: monospace; font-size: 0.8em; resize: vertical; background: rgba(0,0,0,0.3);" readonly placeholder="Chưa có kết nối nào bị đánh chặn..."></textarea>

                        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
                        
                        <div style="font-weight: bold; margin-bottom: 5px;">🧪 Kiểm tra (Test Bypass)</div>
                        <div class="flex-container margin-bot-10px">
                            <input type="text" id="st-tauri-cors-url" class="text_pole" style="flex: 1;" placeholder="https://example.com" value="https://example.com">
                            <div id="st-tauri-cors-test-btn" class="menu_button" style="white-space: nowrap;">Test Fetch</div>
                        </div>

                        <div style="margin-top: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px; font-size: 0.9em;">Mã nguồn trả về:</div>
                            <textarea id="st-tauri-cors-raw" class="text_pole" style="width: 100%; height: 150px; font-family: monospace; font-size: 0.85em; resize: vertical; display: none;" readonly></textarea>
                        </div>
                    </div>
                </div>
            </div>`;
            
            $(container).append(uiHtml);

            // Toggle System
            $('#st-tauri-cors-toggle').on('change', function() {
                setSystemEnabled($(this).is(':checked'));
                toastr.success(`Hệ thống Bypass CORS đã ${$(this).is(':checked') ? 'BẬT' : 'TẮT'}`);
            });

            // Save Settings
            const saveBtn = $('#st-tauri-cors-save-btn');
            const settingsInput = $('#st-tauri-cors-settings-url');
            const blacklistInput = $('#st-tauri-cors-blacklist');
            
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
                    saveBtn.click();
                }
            });

            settingsInput.on('keypress', (e) => {
                if (e.which === 13) saveBtn.click();
            });

            saveBtn.on('click', () => {
                let val = settingsInput.val().trim();
                if (!val) {
                    val = DEFAULT_PROXY;
                    settingsInput.val(val);
                }
                localStorage.setItem(SETTINGS_URL_KEY, val);
                
                const oldText = saveBtn.text();
                saveBtn.text('Đã Lưu!').css('background', 'rgba(16, 185, 129, 0.4)');
                setTimeout(() => {
                    saveBtn.text(oldText).css('background', '');
                }, 2000);
            });

            // Auto-save Blacklist on blur/change
            let blacklistTimeout;
            blacklistInput.on('input', () => {
                clearTimeout(blacklistTimeout);
                blacklistTimeout = setTimeout(() => {
                    localStorage.setItem(SETTINGS_BLACKLIST_KEY, blacklistInput.val());
                }, 500);
            });

            // Test Fetch Logic
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
