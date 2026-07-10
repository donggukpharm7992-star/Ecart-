from __future__ import annotations

import json
from pathlib import Path

from openpyxl import load_workbook


LABEL_DIR = Path(__file__).resolve().parent
SOURCE = LABEL_DIR / "원내보유의약품리스트.xlsx"
OUTPUT = LABEL_DIR / "data" / "hospitalDrugLabels.generated.json"


def clean(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("_x000D_", "").strip()


def is_yes(value: object) -> bool:
    return clean(value).upper() == "Y"


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source workbook: {SOURCE}")

    workbook = load_workbook(SOURCE, data_only=True, read_only=True)
    worksheet = workbook[workbook.sheetnames[0]]
    headers = [clean(value).replace("\n", " ") for value in next(worksheet.iter_rows(min_row=1, max_row=1, values_only=True))]
    index = {header: position for position, header in enumerate(headers)}

    rows: list[dict[str, object]] = []
    for raw in worksheet.iter_rows(min_row=2, values_only=True):
        code = clean(raw[index["약품코드"]])
        name = clean(raw[index["상용약품명"]])
        if not code or not name:
            continue

        rows.append(
            {
                "code": code,
                "name": name,
                "koreanName": clean(raw[index["한글약품명"]]),
                "strength": clean(raw[index["함량"]]),
                "spec": clean(raw[index["규격"]]),
                "package": clean(raw[index["포장"]]),
                "storage": clean(raw[index["보관법"]]),
                "lightProtected": clean(raw[index["차광필요"]]) == "차광",
                "inHospital": is_yes(raw[index["원내보유"]]),
                "similarLook": is_yes(raw[index["유사모양"]]),
                "similarSound": is_yes(raw[index["유사발음"]]),
                "doseCaution": is_yes(raw[index["용량주의"]]),
            }
        )

    rows.sort(key=lambda row: (str(row["name"]).lower(), str(row["code"]).lower()))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} hospital drug label rows to {OUTPUT}")


if __name__ == "__main__":
    main()
