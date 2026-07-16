from __future__ import annotations

import base64
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "약제팀 라벨" / "data" / "hospitalDrugLabels.generated.json"
IMAGE_DIR = ROOT / "public" / "pharmacy-drug-images"
SEARCH_URL = "https://nedrug.mfds.go.kr/searchDrug?searchYn=true&searchDivision=detail&itemName="
DETAIL_URL = "https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq="
HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch_text(url: str) -> str:
    request = Request(url, headers=HEADERS)
    return urlopen(request, timeout=25).read().decode("utf-8", "ignore")


def find_image(korean_name: str) -> tuple[bytes, str]:
    search_html = fetch_text(f"{SEARCH_URL}{quote(korean_name)}")
    item_match = re.search(r"getItemDetail\?itemSeq=(\d+)", search_html)
    if not item_match:
        return b"", ""
    detail_url = f"{DETAIL_URL}{item_match.group(1)}"
    detail_html = fetch_text(detail_url)
    image_match = re.search(r"data:image/(jpeg|jpg|png);base64,([A-Za-z0-9+/=\s]+)", detail_html)
    if not image_match:
        return b"", detail_url
    return base64.b64decode(re.sub(r"\s+", "", image_match.group(2))), detail_url


def main() -> None:
    rows = json.loads(DATA.read_text(encoding="utf-8"))
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    updated = 0
    failed: list[str] = []
    for row in rows:
        if not row.get("inHospital") or not row.get("coloredSideLabel") or row.get("imagePath"):
            continue
        if row.get("drugType") not in {"원병", "PTP"}:
            continue
        korean_name = str(row.get("koreanName", "")).strip()
        if not korean_name:
            failed.append(str(row.get("code", "")))
            continue
        try:
            image, source_url = find_image(korean_name)
            if not image:
                failed.append(str(row.get("code", "")))
                continue
            digest = hashlib.sha1(image).hexdigest()[:16]
            file_name = f"{digest}.jpg"
            (IMAGE_DIR / file_name).write_bytes(image)
            row["imagePath"] = f"pharmacy-drug-images/{file_name}"
            row["imageSourceUrl"] = source_url
            updated += 1
            time.sleep(0.15)
        except Exception:
            failed.append(str(row.get("code", "")))
    DATA.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {updated} colored-side images; failed {len(failed)}: {', '.join(failed)}")


if __name__ == "__main__":
    main()
