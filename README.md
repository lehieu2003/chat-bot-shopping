# Fashion Advisor Chatbot

Chatbot tư vấn mua quần áo thông minh giúp người dùng tìm kiếm sản phẩm phù hợp, tư vấn phong cách và kích cỡ.

## Tính năng

- Tư vấn tìm kiếm quần áo theo nhiều tiêu chí
- Tư vấn kích cỡ phù hợp với người dùng
- Gợi ý phong cách phối đồ
- Tư vấn trang phục theo dịp
- Cung cấp thông tin về giá cả, chất liệu sản phẩm
- Lưu trữ lịch sử trò chuyện và sở thích cá nhân

## Cài đặt

1. Clone repository:

```
git clone https://github.com/yourusername/fashion-advisor-chatbot.git
cd fashion-advisor-chatbot
```

2. Cài đặt các dependencies:

```
npm install
```

3. Tạo file .env trong thư mục gốc và cấu hình:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fashion-chatbot
```

4. Khởi động ứng dụng:

```
npm start
```

## Cách sử dụng

1. Truy cập vào ứng dụng qua địa chỉ `http://localhost:3000`
2. Bắt đầu trò chuyện với chatbot bằng cách gửi tin nhắn
3. Bạn có thể hỏi chatbot về:
   - Tìm kiếm quần áo: "Tôi muốn tìm áo sơ mi trắng"
   - Tư vấn kích cỡ: "Size áo phù hợp với người cao 1m70, nặng 65kg là gì?"
   - Tư vấn phối đồ: "Mặc gì với quần jean xanh đậm?"
   - Giá cả: "Áo khoác dáng dài giá khoảng bao nhiêu?"
   - Tư vấn theo dịp: "Tôi cần trang phục đi tiệc"

## Cấu trúc dự án

```
fashion-advisor-chatbot/
│
├── models/             # Mô hình dữ liệu mongoose
│   ├── Product.js      # Mô hình sản phẩm
│   └── User.js         # Mô hình người dùng
│
├── routes/             # Định tuyến API
│   └── chatbotRoutes.js
│
├── services/           # Logic xử lý
│   ├── chatbotService.js # Xử lý hội thoại chính
│   ├── nlpService.js    # Xử lý ngôn ngữ tự nhiên
│   └── productService.js # Xử lý truy vấn sản phẩm
│
├── public/             # Tài nguyên tĩnh
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── index.html
│
├── .env                # Biến môi trường
├── app.js              # Entry point
├── package.json
└── README.md
```

## Công nghệ sử dụng

- Node.js và Express - Backend framework
- MongoDB và Mongoose - Cơ sở dữ liệu
- Natural - Thư viện xử lý ngôn ngữ tự nhiên
- HTML/CSS/JavaScript - Frontend
