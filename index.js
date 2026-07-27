(function () {
    if (typeof window === 'undefined') return; // Tránh lỗi khi Backend ST vô tình load file này

    const EXTENSION_NAME = 'st-cors-proxy';

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
            
            responseText = typeof data === 'string' ? data : JSON.stringify(data);
            status = 200;
            ok = true;
        } catch (jqXHR) {
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
                        
                        <!-- BẢNG CẢNH BÁO LẮP ĐẶT (TỰ ĐỘNG CÀI ĐẶT) -->
                        <div id="st-cors-proxy-install-warning" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid #f87171; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <h3 style="color: #fca5a5; margin-top: 0; font-size: 1.1em;"><i class="fa-solid fa-triangle-exclamation"></i> PHÁT HIỆN LỖI CÀI ĐẶT!</h3>
                            <p style="font-size: 0.9em; line-height: 1.4; color: #f8fafc; margin-bottom: 15px;">
                                Bạn đã cài tiện ích này thông qua bảng Extensions (Frontend), nên phần lõi Server Backend chưa được kích hoạt. Bạn cần cài phần Backend vào thư mục <b>plugins</b> để vượt rào CORS.
                            </p>
                            <p style="font-size: 0.85em; color: #fbbf24; font-weight: bold; text-align: center;">
                                ⚠️ HÃY COPY LỆNH BÊN DƯỚI RỒI TẮT HẲN CỬA SỔ TERMUX/CMD VÀ KHỞI ĐỘNG LẠI SILLYTAVERN!
                            </p>
                            
                            <p style="font-size: 0.85em; color: #fca5a5; font-weight: bold; text-align: center; margin-top: 5px;">
                                🚨 CHÚ Ý: Mở file config.yaml và đảm bảo dòng "enableServerPlugins: true"
                            </p>

                            <!-- KHUNG COPY THỦ CÔNG (Dành cho Termux/Linux) -->
                            <div id="st-cors-proxy-manual-cmd" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
                                <p style="font-size: 0.85em; color: #fca5a5; margin-bottom: 5px;">Nếu cài đặt 1-Click thất bại hoặc bạn đang dùng Termux, chỉ cần COPY 1 lệnh duy nhất dưới đây và dán vào Termux rồi Enter (Nó sẽ tự cài file và tự bật cấu hình cho bạn):</p>
                                <div style="background: rgba(0,0,0,0.5); padding: 8px; border-radius: 5px; font-family: monospace; color: #34d399; font-size: 0.8em; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; word-break: break-all;">
                                    <span id="st-cors-proxy-cmd-text">cp -r data/*/extensions/st-cors-proxy plugins/ 2>/dev/null || cp -r public/scripts/extensions/st-cors-proxy plugins/ 2>/dev/null; sed -i -E 's/enableServerPlugins:[[:space:]]*false/enableServerPlugins: true/g' config.yaml</span>
                                    <button id="st-cors-proxy-copy-cmd" style="background: #38bdf8; color: black; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-left: 10px; flex-shrink: 0;">COPY</button>
                                </div>
                            </div>
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
            const proxyWarning = $('#st-cors-proxy-install-warning');
            const copyBtn = $('#st-cors-proxy-copy-cmd');
            const cmdText = $('#st-cors-proxy-cmd-text');

            copyBtn.on('click', () => {
                navigator.clipboard.writeText(cmdText.text());
                const oldText = copyBtn.text();
                copyBtn.text('ĐÃ COPY!');
                setTimeout(() => copyBtn.text(oldText), 2000);
            });

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
                proxyWarning.hide();
            } else if (checkStatus === 403) {
                proxyStatus.text(`❌ Lỗi 403 (Thiếu quyền/CSRF)`).css('color', 'red');
            } else if (checkStatus === 404) {
                proxyStatus.text(`❌ 404: LẮP ĐẶT SAI VỊ TRÍ!`).css('color', 'red');
                proxyWarning.show(); // Hiển thị bảng cài đặt cho user
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
