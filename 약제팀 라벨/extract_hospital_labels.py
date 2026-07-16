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
    workbook = load_workbook(SOURCE, data_only=True, read_only=True)
    worksheet = workbook.worksheets[0]
    headers = [clean(value).replace("\n", " ") for value in next(worksheet.iter_rows(min_row=1, max_row=1, values_only=True))]
    index = {header: position for position, header in enumerate(headers)}

    def read(raw: tuple[object, ...], header: str) -> str:
        return clean(raw[index[header]])

    rows: list[dict[str, object]] = []
    for raw in worksheet.iter_rows(min_row=2, values_only=True):
        code = read(raw, "약품코드")
        name = read(raw, "상용약품명")
        if not code or not name:
            continue
        rows.append(
            {
                "code": code,
                "itemCode": read(raw, "물품코드"),
                "name": name,
                "koreanName": read(raw, "한글약품명"),
                "strength": read(raw, "함량"),
                "drugType": read(raw, "약품유형"),
                "highCost": is_yes(raw[index["고가약"]]),
                "spec": read(raw, "규격"),
                "package": read(raw, "포장"),
                "storage": read(raw, "보관법"),
                "lightProtected": read(raw, "차광필요") == "차광",
                "inHospital": is_yes(raw[index["원내보유"]]),
                "oralAnticancer": is_yes(raw[index["경구항암제"]]),
                "similarLook": is_yes(raw[index["유사모양"]]),
                "similarSound": is_yes(raw[index["유사발음"]]),
                "doseCaution": is_yes(raw[index["용량주의"]]),
                "doseCheck": is_yes(raw[index["용량확인"]]),
                "highRisk": is_yes(raw[index["고위험의약품"]]),
                "highRiskCategory": read(raw, "고위험의약품분류"),
                "atc": read(raw, "ATC"),
                "ptpOpened": is_yes(raw[index["PTP깐거"]]),
                "inpatientPowderPtp": is_yes(raw[index["입원산제용PTP 깐거"]]),
                "threeTierHalf": is_yes(raw[index["3단반알"]]),
                "expiry": read(raw, "유효기간"),
                "location": read(raw, "위치"),
                "ampouleHolder": read(raw, "앰플꽂이"),
                "sideLabel1T": read(raw, "1T 3단장 뺑뺑이 PTP 측면라벨"),
                "sideLabelHalfT": read(raw, "0.5T 3단장 뺑뺑이 병 측면라벨"),
                "sideLabelQuarterT": read(raw, "0.25T 3단장 뺑뺑이 병 측면라벨"),
                "coloredSideLabel": read(raw, "3단장 유색 반티통 측면라벨"),
                "coloredSideBackground": read(raw, "3단장 유색 반티통 측면라벨 바탕색"),
                "capLabel": read(raw, "3단장 유색 반티통 병뚜껑"),
                "capBackground": read(raw, "3단장 반티통 병뚜껑 바탕색 기호"),
                "nameCaution": is_yes(raw[index["이름주의"]]),
                "border": is_yes(raw[index["테두리"]]),
                "borderColor": read(raw, "테두리 색기호"),
            }
        )

    rows.sort(key=lambda row: (str(row["name"]).lower(), str(row["code"]).lower()))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} hospital drug label rows to {OUTPUT}")


if __name__ == "__main__":
    main()
