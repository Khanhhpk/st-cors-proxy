# ST CORS Proxy

Một SillyTavern Extension cung cấp cơ chế Bypass CORS bằng cách sử dụng Backend Proxy của ST. 
Được thiết kế đặc biệt tối ưu cho người dùng Mobile (Termux) và Tauri Tavern.

## Tại sao cần nó?
Trình duyệt trên điện thoại hoặc WebView của Tauri không thể cài các Extension Chrome như "Allow CORS". Điều này khiến các kịch bản gọi API từ bên ngoài (như TTS, Ảnh, hay dữ liệu API web) bị chặn hoàn toàn bởi lỗi CORS đỏ rực trong Console.
Tiện ích này giải quyết điều đó bằng cách nhờ Node.js Server của ST (bản thân Node.js không bị vướng CORS) đi lấy dữ liệu giùm và gửi lại về màn hình.

## ⚠️ BẮT BUỘC ĐỌC KHI CÀI ĐẶT
1. Tải và cài đặt Extension này qua link Github trên SillyTavern.
2. **CỰC KỲ QUAN TRỌNG:** Bạn **BẮT BUỘC PHẢI TẮT HẲN ST VÀ KHỞI ĐỘNG LẠI** (Tắt cửa sổ Termux/CMD rồi chạy lại).
Nếu chỉ nhấn F5 (Tải lại trang), phần backend server sẽ không được nhận diện, và bạn sẽ gặp lỗi `404 Not Found`.

## Dành cho Developer
Sau khi cài tiện ích này, trong bất kỳ code của extension nào khác, bạn hãy thay hàm `fetch` thường bằng `window.fetchWithoutCors`.

```javascript
// Code Cũ (Bị chặn CORS):
// const res = await fetch("https://api.vidu.com/data");

// Code Mới (Bypass thành công):
const res = await window.fetchWithoutCors("https://api.vidu.com/data", {
    method: "GET",
    headers: {
        "Authorization": "Bearer XXX"
    }
});

const data = await res.json(); // Hoặc res.text()
console.log(data);
```

## Tính năng kỹ thuật
- **Zero Dependencies:** Code viết 100% bằng API nguyên bản (`native fetch`), người dùng không bao giờ cần phải gõ lệnh `npm install` bên ngoài, cài là ăn ngay.
