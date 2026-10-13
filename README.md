# Frontend HubPlay

Project build riêng, không gộp với backend. `.gitignore` bỏ `.env`, `.env.local`, `node_modules`, `.next`. Khi tách repo, copy cả thư mục `frontend/`. Trình duyệt gọi `/api/*` cùng origin. Next.js rewrite sang Nest theo `BACKEND_URL` trong env (xem `.env.example`). Không đặt nghiệp vụ trong Route Handler. Không dùng `NEXT_PUBLIC_` cho URL API.

```
copy .env.example .env.local
npm install
npm run dev
```

Mặc định `BACKEND_URL=http://127.0.0.1:3001`. Trên VPS, nếu Nest nằm máy khác thì đổi thành URL nội bộ, rồi chỉ mở cổng đó cho máy chạy Next.

Trang khách: `/`. Admin: `/admin/login`.
