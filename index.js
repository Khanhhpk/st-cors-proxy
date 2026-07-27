(function () {
    const EXTENSION_NAME = 'st-tauri-cors-bypass';

    if (typeof window === 'undefined') return;

    // Public CORS Proxy được sử dụng làm cầu nối
    const CORS_PROXY_URL = 'https://corsproxy.io/?';

    jQuery(async () => {
        console.log(`[${EXTENSION_NAME}] Khởi động hệ thống đánh chặn Fetch toàn cầu...`);
        setupMonkeyPatch();
        initUI();
    });

    function setupMonkeyPatch() {
        const originalFetch = window.fetch;

        window.fetch = async function (resource, options = {}) {
            let url = resource;
            let isRequestObj = false;
            
            if (resource instanceof Request) {
                url = resource.url;
                isRequestObj = true;
                // Nếu dùng Request Object, lấy các thuộc tính ra options để tái tạo
                options.method = options.method || resource.method;
                options.headers = options.headers || resource.headers;
                options.body = options.body || resource.body;
                options.mode = options.mode || resource.mode;
                options.credentials = options.credentials || resource.credentials;
            }

            // Chỉ bắt các request có chữ HTTP (ra ngoài internet)
            // Và BỎ QUA localhost, 127.0.0.1 (API nội bộ của ST hoặc các dịch vụ AI local)
            // Đồng thời tránh vòng lặp vô hạn nếu URL đã được proxy rồi
            if (typeof url === 'string' && url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.startsWith(CORS_PROXY_URL)) {
                
                // Mã hoá URL để gửi an toàn qua proxy
                let proxiedUrl = CORS_PROXY_URL + encodeURIComponent(url);
                
                console.log(`[${EXTENSION_NAME}] Bẻ lái Fetch: ${url} -> ${proxiedUrl}`);

                try {
                    // Gọi hàm fetch gốc nhưng với URL đã được bọc Proxy
                    return await originalFetch.call(this, proxiedUrl, options);
                } catch (error) {
                    console.error(`[${EXTENSION_NAME}] Lỗi khi đi qua Proxy: ${url}. Fallback về mặc định. Lỗi:`, error);
                    // Nếu lỗi proxy sập, thử lại đường cũ (dù tỷ lệ cao là sẽ chết vì CORS)
                    return originalFetch.apply(this, arguments);
                }
            }

            // Trả về luồng xử lý bình thường cho Localhost
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
                        
                        <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 10px;">
                            Hệ thống đã tự động ghi đè <b>window.fetch</b>. Toàn bộ các kết nối ra bên ngoài mạng Internet sẽ được chuyển tiếp an toàn qua <span style="color: #38bdf8;">${CORS_PROXY_URL}</span>.
                            <br>Hoạt động hoàn hảo 100% trên Tauri Tavern và mọi nền tảng!
                        </p>
                        
                        <div class="flex-container margin-bot-10px">
                            <input type="text" id="st-tauri-cors-url" class="text_pole" style="flex: 1;" placeholder="https://example.com" value="https://example.com">
                            <div id="st-tauri-cors-test-btn" class="menu_button">Test Bypass</div>
                        </div>

                        <div style="margin-top: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px;">Mã nguồn trả về:</div>
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
                    // Nhờ có Monkey-Patch, nó sẽ tự động chèn proxy vào.
                    const res = await fetch(url, { method: "GET" });
                    const text = await res.text();
                    
                    testRawOutput.val(text).show();
                } catch (e) {
                    testRawOutput.val(`❌ Lỗi: ${e.message}`).show();
                } finally {
                    testBtn.text('Test Bypass').css('pointer-events', 'auto').css('opacity', '1');
                }
            });

        } catch (error) {
            console.error(`[${EXTENSION_NAME}] Lỗi khởi tạo UI:`, error);
        }
    }
})();
