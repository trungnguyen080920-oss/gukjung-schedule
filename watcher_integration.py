"""
PolyGlot Hub — Watcher Integration Snippet
Thay vì chỉ bơm thẻ vào Anki local, gọi thêm API để cập nhật tiến độ online.

Cách dùng:
  1. Lấy API Token từ Dashboard → nút Key (🔑)
  2. Copy snippet này vào anki_engine.py hoặc anki_watcher.py của bạn
  3. Đặt POLYGLOT_API_TOKEN trong environment variable hoặc file .env
"""

import os
import requests


POLYGLOT_API_URL = os.environ.get("POLYGLOT_API_URL", "http://localhost:3000")
POLYGLOT_API_TOKEN = os.environ.get("POLYGLOT_API_TOKEN", "")  # Lấy từ Dashboard → Key


def sync_batch_to_hub(batch: dict, subject_code: str, duration_sec: int = 0) -> bool:
    """
    Đồng bộ 1 batch lên PolyGlot Hub sau khi đã bơm thành công vào Anki.

    :param batch: dict batch JSON (cần có batch_id và cards)
    :param subject_code: mã môn học ("BCT", "TOEIC", "HSK", "JP_N3"...)
    :param duration_sec: thời gian học (giây), mặc định 0
    :return: True nếu đồng bộ thành công
    """
    if not POLYGLOT_API_TOKEN:
        print("[PolyGlot] ⚠  POLYGLOT_API_TOKEN chưa được đặt — bỏ qua sync.")
        return False

    # Đếm số card từ batch
    cards = batch.get("cards", [])
    note_count = len(cards)
    # Mỗi note AUTO-BCT-Vocab-Pro tạo 2 thẻ (front+back), các loại khác 1 thẻ
    card_count = sum(2 if c.get("note_type", "").endswith("Vocab-Pro") else 1 for c in cards)

    # Lấy tầng từ note_type của thẻ đầu tiên (nếu đồng nhất trong batch)
    layer = None
    if cards:
        note_type = cards[0].get("note_type", "")
        # "AUTO-BCT-Vocab-Pro" → "Vocab"
        parts = note_type.split("-")
        if len(parts) >= 3:
            layer = parts[-1].replace("Pro", "").strip() or parts[-2]

    payload = {
        "batchId": batch.get("batch_id"),          # idempotency key
        "subjectCode": subject_code,
        "noteCount": note_count,
        "cardCount": card_count,
        "layer": layer,
        "durationSec": duration_sec,
    }

    try:
        res = requests.post(
            f"{POLYGLOT_API_URL}/api/sync/anki-log",
            headers={
                "Authorization": f"Bearer {POLYGLOT_API_TOKEN}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10,
        )
        data = res.json()
        if res.status_code == 200:
            if data.get("skipped"):
                print(f"[PolyGlot] ⏭  Batch '{payload['batchId']}' đã sync trước đó — bỏ qua.")
            else:
                streak = data.get("progress", {}).get("currentStreak", 0)
                total  = data.get("progress", {}).get("totalNotes", 0)
                print(f"[PolyGlot] ✓  Sync OK — {note_count} note, streak: {streak} ngày, tổng: {total} note")
            return True
        else:
            print(f"[PolyGlot] ✗  Lỗi sync: {data.get('error', res.status_code)}")
            return False
    except requests.exceptions.ConnectionError:
        print("[PolyGlot] ⚠  Không kết nối được server — bỏ qua sync (Anki vẫn hoạt động bình thường).")
        return False
    except Exception as e:
        print(f"[PolyGlot] ✗  Lỗi không xác định: {e}")
        return False


# ── Tích hợp vào anki_engine.py ─────────────────────────────────────────────
# Tìm hàm xử lý batch thành công trong anki_engine.py của bạn, thêm 1 dòng:
#
#   def process_batch(batch_path):
#       with open(batch_path) as f:
#           batch = json.load(f)
#       push_to_anki(batch)           # code cũ của bạn
#       sync_batch_to_hub(batch, subject_code=detect_subject(batch))  # ← THÊM DÒNG NÀY
#
# Hàm detect_subject gợi ý:
def detect_subject(batch: dict) -> str:
    """Tự nhận diện mã môn từ batch_id hoặc deck name."""
    batch_id = batch.get("batch_id", "").lower()
    deck     = batch.get("deck", "").lower()

    if "bct" in batch_id or "bct" in deck:   return "BCT"
    if "toeic" in batch_id or "toeic" in deck: return "TOEIC"
    if "hsk" in batch_id or "hsk" in deck:   return "HSK"
    if "jp" in batch_id or "nhật" in deck:    return "JP_N3"
    if "react" in batch_id or "react" in deck: return "REACT"
    # Thêm môn mới ở đây theo code trong Admin Panel
    return "UNKNOWN"
