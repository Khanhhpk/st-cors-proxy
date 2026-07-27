/**
 * ST CORS Proxy Client API
 * 
 * Cách sử dụng ở các file extension khác:
 * const res = await window.fetchWithoutCors("https://api.bichancors.com/data");
 * const data = await res.text();
 */
const EXTENSION_NAME = 'st-cors-proxy';
const EXTENSION_PATH = `extensions/${EXTENSION_NAME}`;

async function fetchWithoutCors(targetUrl, fetchOptions = {}) {
    const proxyUrl = `/api/plugins/${EXTENSION_NAME}/proxy`;
    
    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: targetUrl,
            options: fetchOptions
        })
    });
    
    // Gói lại thành dạng Response object để giống hệt hàm fetch thông thường
    const responseText = await response.text();
    
    return {
        ok: response.ok,
        status: response.status,
        text: async () => responseText,
        json: async () => JSON.parse(responseText)
    };
}

// Gắn vào window để các extension khác gọi thoải mái
window.fetchWithoutCors = fetchWithoutCors;

async function initUI() {
    try {
        // Tải HTML giao diện
        const html = await $.get(`${EXTENSION_PATH}/settings.html`);
        $('#extensions_settings').append(html);

        // Bind element
        const proxyStatus = $('#st-cors-proxy-status');
        const proxyBtn = $('#st-cors-proxy-test-btn');
        const proxyInput = $('#st-cors-proxy-url');
        const proxyIframeContainer = $('#st-cors-proxy-iframe-container');
        const proxyIframe = $('#st-cors-proxy-iframe');
        const proxyRawOutput = $('#st-cors-proxy-raw');

        // Kiểm tra xem backend proxy có hoạt động không
        try {
            const checkRes = await fetch(`/api/plugins/${EXTENSION_NAME}/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: '' }) // Gửi rỗng để test ping
            });
            
            if (checkRes.status === 400 || checkRes.ok) {
                proxyStatus.text('✅ Đang hoạt động (Server Proxy OK)').css('color', 'lightgreen');
            } else {
                proxyStatus.text(`❌ Lỗi kết nối (${checkRes.status})`).css('color', 'red');
            }
        } catch (err) {
            proxyStatus.text(`❌ Không tìm thấy Server (Bạn đã Restart chưa?)`).css('color', 'red');
        }

        // Sự kiện click nút Test
        proxyBtn.on('click', async () => {
            let url = proxyInput.val().trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            proxyBtn.text('Đang tải...').css('pointer-events', 'none').css('opacity', '0.5');
            proxyRawOutput.hide();
            proxyIframeContainer.hide();
            proxyIframe.attr('srcdoc', ''); // Xóa iframe cũ

            try {
                // Sử dụng chính hàm fetchWithoutCors để test
                const res = await fetchWithoutCors(url, { method: "GET" });
                const text = await res.text();
                
                // Hiển thị iframe
                proxyIframe.attr('srcdoc', text);
                proxyIframeContainer.show();
                
                // Hiển thị source thô
                proxyRawOutput.val(text).show();
                
            } catch (e) {
                proxyRawOutput.val(`❌ Lỗi Fetch: ${e.message}`).show();
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
    await initUI();
});
