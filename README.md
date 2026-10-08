# Engine video tin tức 9:16 (Remotion)

Engine dùng chung cho các skill `tin-30s-nam`, `tin-45s-nam`, `tin-60s-nam` và `tin-45s-nu` (giọng nữ).

- `engine/` — build_remotion.py, fetch_article.py, tts_worker.py, remotion/
- `skills/` — bản SKILL.md gọn của từng skill (không chứa code, chỉ trỏ về repo này)
- Theme: `"theme": "navy"` (mặc định, accent cam) hoặc `"purple"` (nền tím than, accent xanh lá, karaoke vàng) trong brief.json
- `engine/scan_news.py` — quét trang chuyên mục BĐS các báo, xuất danh sách ứng viên gọn (TSV), bỏ link đã có (`--seen`); dùng cho task quét tin hằng ngày
- `engine/fetch_article.py` — tải bài + ảnh; tự ghép ảnh thành `media/contact.jpg` (có số) để chỉ xem 1 lần
