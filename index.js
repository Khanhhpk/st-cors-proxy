(function () {
    const EXTENSION_NAME = 'st-cors-proxy';

    /**
     * Dùng jQuery.ajax thay cho fetch để SillyTavern tự động lo liệu vụ X-CSRF-Token
     */
    async function fetchWithoutCors(targetUrl, fetchOptions = {}) {
        const proxyUrl = `/api/plugins/${EXTENSION_NAME}/proxy`;
        
        let responseText = '';
        let status = 500;
        let ok = false;

        try {
            const data = await $.ajax({
                url: proxyUrl,
                type: 'POST',
                data: JSON.stringify({
                    url: targetUrl,
                    options: fetchOptions
                }),
                contentType: 'application/json'
            });
            
            // Thành công (200 OK)
            responseText = typeof data === 'string' ? data : JSON.stringify(data);
            status = 200;
            ok = true;
        } catch (jqXHR) {
            // Thất bại (403, 404, 500...)
            responseText = jqXHR.responseText || jqXHR.statusText || 'Unknown Error';
            status = jqXHR.status || 500;
            ok = false;
        }

        return {
            ok: ok,
            status: status,
            text: async () => responseText,
            json: async () => {
                try { return JSON.parse(responseText); } catch(e) { return {}; }
            }
        };
    }

    window.fetchWithoutCors = fetchWithoutCors;

    async function initUI() {
        try {
            const container = document.getElementById('extensions_settings');
            if (!container) {
                setTimeout(initUI, 1000);
                return;
            }

            if (document.getElementById('st-cors-proxy-settings')) return;

            const uiHtml = `
            <div class="extension_settings" id="st-cors-proxy-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>ST CORS Proxy</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container alignitemscenter margin-bot-10px">
                            <span style="margin-right: 10px;">Trạng thái Proxy:</span>
                            <b id="st-cors-proxy-status" style="color: yellow;">Đang kiểm tra...</b>
                        </div>
                        
                        <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 10px;">
                            Nhập một URL bất kỳ (kể cả bị chặn CORS) để test thử sức mạnh của Proxy.
                        </p>
                        
                        <div class="flex-container margin-bot-10px">
                            <input type="text" id="st-cors-proxy-url" class="text_pole" style="flex: 1;" placeholder="https://example.com" value="https://example.com">
                            <div id="st-cors-proxy-test-btn" class="menu_button">Test Link</div>
                        </div>

                        <div id="st-cors-proxy-iframe-container" style="display: none; width: 100%; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px; margin-top: 10px;">
                            <div style="background: var(--SmartThemeBlurTintColor); padding: 5px; font-weight: bold; border-bottom: 1px solid var(--SmartThemeBorderColor);">
                                Khung Iframe Render (Thử nghiệm)
                            </div>
                            <iframe id="st-cors-proxy-iframe" style="width: 100%; height: 300px; border: none; background: white;"></iframe>
                        </div>

                        <div style="margin-top: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px;">Mã HTML/JSON thô trả về:</div>
                            <textarea id="st-cors-proxy-raw" class="text_pole" style="width: 100%; height: 150px; font-family: monospace; font-size: 0.85em; resize: vertical; display: none;" readonly></textarea>
                        </div>
                    </div>
                </div>
            </div>`;
            
            $(container).append(uiHtml);

            const proxyStatus = $('#st-cors-proxy-status');
            const proxyBtn = $('#st-cors-proxy-test-btn');
            const proxyInput = $('#st-cors-proxy-url');
            const proxyIframeContainer = $('#st-cors-proxy-iframe-container');
            const proxyIframe = $('#st-cors-proxy-iframe');
            const proxyRawOutput = $('#st-cors-proxy-raw');

            // Ping server một cách an toàn nhất
            let checkStatus = 500;
            try {
                await $.ajax({
                    url: `/api/plugins/${EXTENSION_NAME}/proxy`,
                    type: 'POST',
                    data: JSON.stringify({ url: '' }),
                    contentType: 'application/json'
                });
                checkStatus = 200;
            } catch (jqXHR) {
                checkStatus = jqXHR.status || 500;
            }

            if (checkStatus === 400 || (checkStatus >= 200 && checkStatus < 300)) {
                proxyStatus.text('✅ Đang hoạt động (Server Proxy OK)').css('color', 'lightgreen');
            } else if (checkStatus === 403) {
                proxyStatus.text(`❌ Lỗi 403 (Thiếu quyền/CSRF)`).css('color', 'red');
            } else if (checkStatus === 404) {
                proxyStatus.text(`❌ Lỗi 404 (Chưa nhận diện được Backend. HÃY RESTART LẠI SILLYTAVERN!)`).css('color', 'red');
            } else {
                proxyStatus.text(`❌ Lỗi kết nối (${checkStatus})`).css('color', 'red');
            }

            proxyBtn.on('click', async () => {
                let url = proxyInput.val().trim();
                if (!url) return;
                if (!url.startsWith('http')) url = 'https://' + url;

                proxyBtn.text('Đang tải...').css('pointer-events', 'none').css('opacity', '0.5');
                proxyRawOutput.hide();
                proxyIframeContainer.hide();
                proxyIframe.attr('srcdoc', '');

                try {
                    const res = await fetchWithoutCors(url, { method: "GET" });
                    const text = await res.text();
                    
                    proxyIframe.attr('srcdoc', text);
                    proxyIframeContainer.show();
                    proxyRawOutput.val(text).show();
                    
                } catch (e) {
                    proxyRawOutput.val(`❌ Lỗi Fetch: ${e.message}`).show();
                    proxyRawOutput.show();
                } finally {
                    proxyBtn.text('Test Link').css('pointer-events', 'auto').css('opacity', '1');
                }
            });

        } catch (error) {
            console.error('[ST CORS Proxy] Lỗi khởi tạo UI:', error);
        }
    }

    jQuery(async () => {
        console.log(`[ST CORS Proxy] Đã tải thành công.`);
        initUI();
    });
})();
