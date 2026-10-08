---
name: "tin-45s-nam"
description: "Làm video tin tức tổng hợp dọc 9:16 dài 45 giây bằng Remotion từ link bài báo (giọng VieNeu, hiệu ứng động, phụ đề karaoke, SFX). Dùng khi cần video 45s hoặc tin dài hơn bản 30s."
---

# Video tin tức 9:16 bằng Remotion — bản 45 giây

Bản dài 45s của skill `video-tin-tuc-remotion` (bản 30s), dùng cho tin cần nội dung dài hơn bản 30s (nhiều số liệu, 2 bên liên quan). Engine, giọng, hiệu ứng, nhạc, SFX giữ nguyên như bản 30s; chỉ khác độ dài và cách viết kịch bản. Bản khác: `video-tin-tuc-remotion` (30s), `video-tin-tuc-remotion-60s`, bản nhẹ `video-doc-tu-link`. Cùng định dạng `brief.json` / `scenes.json`.
Kết quả: `out/<slug>.mp4` (1080×1920, 30fps, có giọng + nhạc + SFX) + `.srt` + `.txt`. Video **45–50 giây** (`duration_range: [45, 50]` — luôn ghi trong brief); ≈ 4 phút render (2 CPU).

## Cài đặt (mỗi phiên mới, ~2 phút)

1. Lấy engine (dùng chung cho mọi bản 30s/45s/60s/giọng nữ):
   ```bash
   [ -d engine ] || { git clone -q --depth 1 https://github.com/truyenng/skill-video-tin-tuc-engine.git _vt && mv _vt/engine engine && rm -rf _vt; }
   ```
   Clone báo 403/404 (repo private chưa gắn vào phiên) → gọi tool `add_repo` với owner/repo `truyenng/skill-video-tin-tuc-engine` rồi clone lại. Không đọc code engine trừ khi cần sửa hiệu ứng/layout.
2. Remotion: `cd engine/remotion && NO_PROXY= no_proxy= npm install --no-audit --no-fund --noproxy=localhost`
   (npm/pip phải đi QUA proxy: biến NO_PROXY mặc định chứa registry.npmjs.org/pypi.org nên đi thẳng sẽ bị 403.)
   Chromium: tự dò `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`; khác thì đặt `REMOTION_CHROME`.
3. Giọng VieNeu-TTS (bỏ qua nếu brief không có `voice`):
   ```bash
   python3 -m venv ~/vn && NO_PROXY=localhost no_proxy=localhost ~/vn/bin/pip install -q vieneu
   ```
   Lần TTS đầu tải model (~550MB) từ Hugging Face — cần allowlist `huggingface.co`, `*.hf.co`. Venv ở chỗ khác → đặt `VIENEU_PY`.
4. Tải bài báo cần domain báo + CDN ảnh trong allowlist (vd `cafef.vn`, `cafefcdn.com`). Bị chặn → báo người dùng tên domain cần thêm, không vượt chặn.

## Quy trình

1. **Tải bài gốc**: `python3 engine/fetch_article.py "<url>" <slug>` → `<slug>/source.md` (toàn văn), `media/article-N.jpg` (ảnh trong bài, bỏ thumbnail), video mp4/m3u8 nếu có, `media/credits.json`. Xem ảnh bằng Read để chọn ảnh đúng nội dung (loại ảnh lạc đề hoặc gây hiểu sai).
   **Luôn viết kịch bản từ `source.md` toàn văn**, không từ bản tóm tắt WebFetch — tóm tắt từng làm sai nghĩa (giá sau ưu đãi bị ghi thành giá niêm yết).
2. **Kịch bản để người dùng DUYỆT trước khi render** — bảng # | Lời đọc | Hình. **Video 45–50s, không tăng tốc giọng: 6–7 cảnh, mỗi cảnh 1–2 câu ngắn (1 ý/cảnh); tổng lời đọc (tính cả phần `pronounce` đọc thay, vd "TP HCM" = 6 âm tiết): **giọng Hải Đăng ~225–255 âm tiết**, Minh Đức ~170–195 — `--check` tính đúng theo giọng**. Cách làm: liệt kê mọi ý/số trong bài → chọn 5–6 ý đắt nhất → mỗi ý 1 cảnh, bỏ từ đệm ("hiện nay", "đáng chú ý là"…), gộp số vào câu. Thời lượng dài hơn để **thêm ý và bối cảnh**, không kéo dài câu hay lặp lại. Mạch: Hook có con số trong 2 giây đầu → bối cảnh/vì sao đáng chú ý → số liệu chính → chi tiết 1 → chi tiết 2 / so sánh → tác động, ai bị ảnh hưởng → kết luận. Bài gốc không đủ ý cho 45s → báo người dùng và đề xuất dùng bản ngắn hơn, không độn chữ/bịa thêm.
   - Đổi kiểu cảnh liên tục (không 2 cảnh liền cùng `type`), mỗi 2–3 cảnh có 1 cảnh ảnh/`image` hoặc `kinetic` để giữ nhịp; ảnh trong bài dùng lại được với `motion` khác.
   - Không bịa số; mọi số phải có trong bài. So sánh phải cùng chuẩn. Tin xung đột/thảm họa: trung lập, ghi nguồn phát ngôn, `bgm_mood: somber`.
   - **Không đọc tên báo/nguồn trong lời đọc** (bỏ hẳn câu kiểu "Nguồn VnExpress", "Theo CafeF" ở cuối clip — người dùng yêu cầu). Nguồn chỉ hiện bằng chữ: góc trên phải tự ghi `Nguồn: <source_name>`, có thể thêm `footer` ở cảnh cuối. Câu cuối kết bằng ý chính/tác động của tin. (Ghi người phát ngôn khi trích dẫn vẫn giữ.)
   - Lời đọc viết cho TTS: số thập phân dùng dấu phẩy ("1,4 lít"); tên nước ngoài thêm vào `pronounce`.
   - Ảnh báo có bản quyền: nhắc người dùng, ghi `image_credit`.
3. Ghi `<slug>/brief.json` + `<slug>/scenes.json`.
4. **Kiểm tra độ dài** (không tốn TTS): `python3 engine/build_remotion.py <slug> --check` → in số âm tiết (đã tính phần đọc thay), độ dài ước tính theo tốc độ riêng của giọng và khung âm tiết cho 45–50s. Giọng chưa đo tốc độ → đặt `"tts_rate"` (âm tiết/giây) sau lần build đầu. DÀI → viết gọn lại kịch bản (không cắt số liệu chính), chạy `--check` lại tới khi vừa khung; NGẮN nhiều → thêm 1 ý.
   **Preview**: `python3 engine/build_remotion.py <slug> --preview` → Read `out/preview.png` (1 khung/cảnh). Sửa tới khi không tràn chữ/chồng lấn.
5. **Render**: chạy nền vì >2 phút: `nohup python3 engine/build_remotion.py <slug> > <slug>/build.log 2>&1 &` rồi `sleep` + `tail` log tới khi có `XONG`.
6. Kiểm tra: ffprobe thời lượng, trích 3–4 khung (có khung chuyển cảnh) xem lại. Giao MP4 qua `/mnt/user-data/outputs/` + SendUserFile (+ commit vào thư mục người dùng nếu có).

**Nhiều video/ngày**: lặp quy trình cho từng link (TTS có cache, mỗi video 45s ~4 phút). Có thể đặt scheduled task để tự chạy hằng ngày; vẫn phải có bước người duyệt số liệu trước khi đăng.

## brief.json

```json
{
  "slug": "soluto-thang10",
  "top_left": "TIN XE · 06/10/2026",
  "source_name": "CafeF",
  "handle": "@kenh_cua_ban",
  "accent": "#fb923c",
  "voice": "Hải Đăng",
  "duration_range": [45, 50],
  "voice_speed": 1.1,
  "pronounce": {"TP HCM": "Thành phố Hồ Chí Minh", "UBND": "Ủy ban nhân dân", "ha": "héc-ta", "VnExpress": "Vi-en Ếch-prét", "Soluto": "Xô-lu-tô", "Thaco": "Tha-cô", "Deluxe": "Đi-lắc", "MT": "em-tê", "Vios": "Vi-ốt", "Accent": "Ắc-xen", "Attrage": "Át-tra", "CafeF": "Ca-phê ép"},
  "bgm_mood": "tech | news | calm | energetic | somber",
  "sfx": true,
  "subtitles": true
}
```
- `duration_range`: khung độ dài — skill này dùng **[45, 50]**, bắt buộc ghi trong brief (engine mặc định 30–35 nếu thiếu). Sau khi tạo giọng, nếu video dài hơn khung → build **DỪNG** và báo số âm tiết cần cắt → rút gọn `scenes.json`, chạy lại (chỉ câu đổi mới tạo lại giọng). **Không bao giờ tăng tốc giọng để ép thời lượng** — `voice_speed` giữ 1.1 theo người dùng chọn. `--force` bỏ qua giới hạn khi người dùng đồng ý video dài hơn.
- `voice`: giọng VieNeu — **mặc định Hải Đăng (nam Bắc, người dùng chọn)**. 25 giọng; giọng Bắc: Adam bựa, Trúc Ly, Thiện Minh, Mai Anh, Hải Đăng, Thiền Tâm Đức, Ngọc Huyền, Minh Đức, Phạm Tuyên, Xuân Vĩnh, Thanh Bình, Ngọc Linh, Đoan Trang, Quỳnh Anh, Quốc Tuấn. Tốc độ đo ở 1.1x: Hải Đăng ≈5,8 âm tiết/s, Minh Đức ≈4,4. Bỏ `voice` → không tạo giọng, dùng `speech_rate` ước lượng + giao `.srt` để tạo giọng ở CapCut.
- `voice_speed`: 1.1 = nhanh 10% (giữ cao độ). Khoảng lặng đầu/cuối câu tự cắt.
- `pronounce`: chỉ đổi cách ĐỌC, phụ đề giữ nguyên chữ. Kiểm tra cách đọc: `~/vn/bin/python -c "from vieneu_utils.phonemize_text import phonemize_text_with_emotions as P; print(P('kia soluto'))"` — từ bị phiên âm kiểu tiếng Anh sai → thêm phiên âm Việt. "Kia" đã ra 1 âm tiết /kiə/; nếu nghe vẫn như "ki-a" thì là do model, đổi chữ không giúp — tạo lại câu đó hoặc thử "xe Kia".

## scenes.json — mảng cảnh

Chung: `type`, `narration` (bắt buộc), `eyebrow`, `title`, `image` + `image_credit` (ảnh hero đầu cảnh), `note` {text, sub, tone: red|green|gray|""} (hiện ở ~60% cảnh), `chips_title` + `chips`, `footer`, `transition` (zoom|slide|wipe|flip|up — bỏ trống tự luân phiên), `hold` (giây nghỉ cuối cảnh). `**chữ**` → tô accent + vệt marker chạy.

| type | Trường riêng | Hiệu ứng |
|---|---|---|
| `hook` | `pre`, `prefix`, `number`, `from`, `unit` | Số khổng lồ đếm spring + nảy + phát sáng |
| `stat` | `label`, `prefix`, `number`, `from`, `suffix`, `unit` | Vòng tròn tự vẽ quanh số đếm |
| `table` | `columns`, `rows`, `strike_col`, `hl_col`, `footnote` | Hàng trượt vào, gạch giá cũ, giá mới bật sáng |
| `bars` | `items` [{label, sub, value, display, hl}], `max`, `footnote` | Cột chạy + số đếm, cột nổi bật có ánh kim chạy |
| `tiles` | `items` [{value, unit, label}] | Ô lật 3D, số đếm ("4.300", "1,4") |
| `alert` | `icon`, `headline`, `sub` | Rung + viền đỏ nhịp sáng |
| `verdict` | `pros_title`, `pros`, `cons_title`, `cons` | 2 thẻ trượt trái/phải |
| `list` | `items` (≤5) | Vòng số tự vẽ, dòng trượt vào |
| `quote` | `quote`, `by` | Gõ chữ từng ký tự |
| `image` | `image`, `image_credit`, `motion`, `text`, `height` | Ken Burns + vệt sáng quét |
| `compare` | `left`/`right` {title, value, sub}, `winner`, `badge` | 2 thẻ đối đầu + huy hiệu VS xoay |
| `kinetic` | `lines` [..], `size` | Chữ đập vào màn hình từng dòng (cảnh kết/CTA) |

`motion` ảnh: zoom-in, zoom-out, pan-left, pan-right, pan-up, pan-down, none. Bố cục: nội dung y=210–1440, phụ đề y≈1480–1790; tiêu đề ≤2 dòng; cảnh có ảnh không nhồi bảng/biểu đồ; mỗi cảnh ≤6 phần tử.

## Sửa nhanh

| Muốn đổi | Sửa | Chạy |
|---|---|---|
| Lời / số / hình | `scenes.json` | preview → build (chỉ câu đổi mới TTS lại) |
| Tốc độ giọng / giọng khác | `voice_speed` / `voice` | build |
| Đọc sai tên riêng | `pronounce` | build |
| Hiệu ứng, layout | `engine/remotion/src/*.tsx` (sửa xong thì commit lên repo engine để giữ cho lần sau) | preview → build |
