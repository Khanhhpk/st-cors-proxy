(function () {
    const EXTENSION_NAME = 'st-tauri-cors-bypass';

    if (typeof window === 'undefined') return;

    let isTauriActive = false;

    jQuery(async () => {
        console.log(`[${EXTENSION_NAME}] Đang kiểm tra môi trường Tauri Tavern...`);

        if (!window.__TAURI__ || !window.__TAURI__.http || typeof window.__TAURI__.http.fetch !== 'function') {
            console.warn(`[${EXTENSION_NAME}] Không tìm thấy lõi Tauri! Tiện ích này chỉ hoạt động trên Tauri Tavern. Bypass CORS bị vô hiệu hoá.`);
        } else {
            console.log(`[${EXTENSION_NAME}] 🔥 Đã phát hiện Tauri Tavern! Đang ghi đè hệ thống fetch để Bypass toàn bộ CORS...`);
            isTauriActive = true;
            setupMonkeyPatch();
        }

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
            }

            // Chỉ bắt các request gọi ra bên ngoài
            if (typeof url === 'string' && url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
                try {
                    let tauriBody = undefined;
                    if (options.body) {
                        if (typeof options.body === 'string') {
                            tauriBody = window.__TAURI__.http.Body.text(options.body);
                        } else if (options.body instanceof Uint8Array || options.body instanceof ArrayBuffer) {
                            tauriBody = window.__TAURI__.http.Body.bytes(options.body);
                        } else if (options.body instanceof FormData) {
                            const formObj = {};
                            options.body.forEach((value, key) => formObj[key] = value);
                            tauriBody = window.__TAURI__.http.Body.form(formObj);
                        } else {
                            tauriBody = window.__TAURI__.http.Body.text(JSON.stringify(options.body));
                        }
                    }

                    let tauriHeaders = {};
                    if (options.headers) {
                        if (options.headers instanceof Headers) {
                            options.headers.forEach((value, key) => tauriHeaders[key] = value);
                        } else {
                            tauriHeaders = options.headers;
                        }
                    }

                    const tauriOptions = {
                        method: options.method || 'GET',
                        headers: tauriHeaders,
                        responseType: window.__TAURI__.http.ResponseType.Binary, 
                        body: tauriBody
                    };

                    const tauriResponse = await window.__TAURI__.http.fetch(url, tauriOptions);

                    let bodyData = tauriResponse.data;
                    if (Array.isArray(bodyData)) {
                        bodyData = new Uint8Array(bodyData);
                    }

                    return new Response(bodyData, {
                        status: tauriResponse.status,
                        headers: new Headers(tauriResponse.headers)
                    });

                } catch (error) {
                    console.error(`[${EXTENSION_NAME}] Tauri Fetch thất bại tại URL: ${url}. Đang lùi về Fetch mặc định. Lỗi:`, error);
                    return originalFetch.apply(this, arguments);
                }
            }

            return originalFetch.apply(this, arguments);
        };
        console.log(`[${EXTENSION_NAME}] ✅ Thành công! Toàn bộ Fetch API đã được chuyển hướng qua lõi Rust của Tauri.`);
    }

    async function initUI() {
        try {
            const container = document.getElementById('extensions_settings');
            if (!container) {
                setTimeout(initUI, 1000);
                return;
            }

            if (document.getElementById('st-tauri-cors-bypass-settings')) return;

            const statusText = isTauriActive ? 
                '<b id="st-tauri-cors-status" style="color: lightgreen;">✅ Đang hoạt động (Tauri Fetch Interceptor OK)</b>' : 
                '<b id="st-tauri-cors-status" style="color: #fca5a5;">❌ Tắt (Không tìm thấy môi trường Tauri Tavern)</b>';

            const uiHtml = `
            <div class="extension_settings" id="st-tauri-cors-bypass-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>ST Tauri CORS Bypass</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container alignitemscenter margin-bot-10px">
                            <span style="margin-right: 10px;">Trạng thái hệ thống:</span>
                            ${statusText}
                        </div>
                        
                        <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 10px;">
                            Nhập một URL bất kỳ (kể cả bị chặn CORS) để test sức mạnh của hệ thống đánh chặn Tauri. <br>
                            <i>Lưu ý: Nút Test này sử dụng hàm <b>fetch()</b> nguyên bản của Javascript để chứng minh rằng hệ thống đã được ghi đè thành công.</i>
                        </p>
                        
                        <div class="flex-container margin-bot-10px">
                            <input type="text" id="st-tauri-cors-url" class="text_pole" style="flex: 1;" placeholder="https://example.com" value="https://example.com">
                            <div id="st-tauri-cors-test-btn" class="menu_button">Test Link</div>
                        </div>

                        <div style="margin-top: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px;">Mã nguồn trả về (Text/JSON):</div>
                            <textarea id="st-tauri-cors-raw" class="text_pole" style="width: 100%; height: 150px; font-family: monospace; font-size: 0.85em; resize: vertical; display: none;" readonly></textarea>
                        </div>
                    </div>
                </div>
            </div>`;
            
            $(container).append(uiHtml);

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
                    // Gọi hàm fetch mặc định! 
                    // Nếu hệ thống đánh chặn hoạt động, nó sẽ tự lọt qua Tauri.
                    const res = await fetch(url, { method: "GET" });
                    const text = await res.text();
                    
                    testRawOutput.val(text).show();
                } catch (e) {
                    testRawOutput.val(`❌ Lỗi Fetch: ${e.message}`).show();
                } finally {
                    testBtn.text('Test Link').css('pointer-events', 'auto').css('opacity', '1');
                }
            });

        } catch (error) {
            console.error(`[${EXTENSION_NAME}] Lỗi khởi tạo UI:`, error);
        }
    }
})();
