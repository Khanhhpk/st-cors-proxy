(function () {
    const EXTENSION_NAME = 'st-tauri-cors-bypass';

    if (typeof window === 'undefined') return;

    jQuery(async () => {
        console.log(`[${EXTENSION_NAME}] Đang kiểm tra môi trường Tauri Tavern...`);

        if (!window.__TAURI__ || !window.__TAURI__.http || typeof window.__TAURI__.http.fetch !== 'function') {
            console.warn(`[${EXTENSION_NAME}] Không tìm thấy lõi Tauri! Tiện ích này chỉ hoạt động trên Tauri Tavern. Bypass CORS bị vô hiệu hoá.`);
            return;
        }

        console.log(`[${EXTENSION_NAME}] 🔥 Đã phát hiện Tauri Tavern! Đang ghi đè hệ thống fetch để Bypass toàn bộ CORS...`);

        const originalFetch = window.fetch;

        window.fetch = async function (resource, options = {}) {
            let url = resource;
            if (resource instanceof Request) {
                url = resource.url;
                // Có thể cần copy thêm options từ Request object nếu cần thiết
                options.method = options.method || resource.method;
                options.headers = options.headers || resource.headers;
            }

            // Chỉ bắt các request gọi ra bên ngoài, bỏ qua localhost hoặc đường dẫn nội bộ (API của ST)
            if (typeof url === 'string' && url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
                try {
                    // Chuyển đổi Body của chuẩn Web Fetch sang chuẩn Tauri Fetch
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
                            // Fallback cho JSON hoặc dạng khác
                            tauriBody = window.__TAURI__.http.Body.text(JSON.stringify(options.body));
                        }
                    }

                    // Trích xuất Headers
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
                        responseType: window.__TAURI__.http.ResponseType.Binary, // Lấy Binary để bảo toàn dữ liệu (ảnh, âm thanh, text)
                        body: tauriBody
                    };

                    const tauriResponse = await window.__TAURI__.http.fetch(url, tauriOptions);

                    // Gói dữ liệu Tauri trả về thành chuẩn Response của trình duyệt Web
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

            // Trả về luồng xử lý bình thường cho các API nội bộ (Localhost)
            return originalFetch.apply(this, arguments);
        };

        console.log(`[${EXTENSION_NAME}] ✅ Thành công! Toàn bộ Fetch API đã được chuyển hướng qua lõi Rust của Tauri.`);
    });
})();
