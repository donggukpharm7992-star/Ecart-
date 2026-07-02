# Pharmacy Label Studio Design

## Context

The pharmacy label screen will be a separate workspace opened from the existing drug label output flow. It should not show the full ward stock master table beneath it. The approved preview is the version titled "빈 하단칸 없는 라벨 미리보기" served during design review.

The first implementation scope is the `약품명 라벨` workspace. The other label types remain as empty tabs for later work: `약품장 라벨`, `3단 약병장`, and `외용장 라벨`.

## Approved Screen Layout

The workspace has three main columns.

- Left: drug selection list. It shows only the information needed for selection: checkbox, drug name, drug code/category summary, and match status badge. It must not show match score, source workbook, or cell location in the default list.
- Center: label edit canvas. This is where existing matched labels, newly created labels, manual edits, and drawing/editing modes are visible.
- Right: collapsible tool and detail panels. Size, border, text, optional footer text, matching details, file connection information, and save priority live here.

The header contains the search box plus `약품리스트 관리` and `비품관리로 돌아가기`. Label type buttons sit below the header without an extra "라벨 작업" prefix.

## Label Preview Rules

The label preview must show only content that may be printed on the physical label. Management metadata such as drug code, match status, match source, or current size must stay outside the label canvas.

The default label does not include an empty footer row. A footer text area appears only when the user enables `하단 문구 영역 사용`, and only for content that should print, such as storage or ward-specific wording.

The preview supports manual editing. After saving, the latest saved label for that drug becomes the default preview and print source.

## Size And Style Tools

The right tool panel keeps `크기 설정` open by default.

- Users can pick preset sizes, including the current default `35 x 100 mm`.
- Users can enter custom width and height in mm.
- The selected size updates the canvas preview.
- If a user saves a custom size for a drug, that saved size becomes the default for that drug.
- Border controls are separated from text controls.
- Border controls include outer border thickness/color and text outline thickness/color.
- Text controls include font, font size, drug-name color, and warning text color.

## Matching Data

The matching workbook is `원내보유의약품_라벨매칭_20260702.xlsx`.

The app should match by `약품코드` whenever possible. Relevant workbook fields include `약품코드`, `상용약품명`, `한글약품명`, `보관법`, warning flags, `해당라벨`, `라벨원본파일`, `라벨시트/문서위치`, `매칭상태`, and `매칭점수`.

Default display priority:

1. If a saved edited label exists for the drug, show that saved label.
2. Otherwise, if the workbook has a matched label, show the matched label using the matched/default size and approved label shape.
3. Otherwise, create a new editable label from the drug name and selected/default size.

Match score and source location are hidden from the selection list. They are visible only in the right-side `매칭 상세` panel.

## Drug List Management And Sync

The label workspace needs a `약품리스트 관리` area for managing drug metadata used by labels and inventory screens.

Fields that must be editable and synced by `약품코드` include storage condition, dosage caution, similar appearance, similar sound, narcotic, psychotropic, high-risk, anticancer, high-cost/statistical, and other warning flags.

When these fields change, label output and any matching drug entry in the ward inventory screen must reflect the change. The sync key is always `약품코드`.

## Batch Printing

The drug list supports selecting multiple drugs. Users can print selected labels in one run.

Paper size must support A4 and A3. If the selected labels span multiple pages, the print flow must print all pages together.

## Storage Model

Newly created or edited labels are stored in an app-level "약품 라벨" repository. The first implementation persists this repository in browser local storage behind a small repository module, so the storage backend can later be replaced without changing label UI components. The repository must support lookup by `약품코드` and latest-saved label selection.

Each saved label should preserve:

- `약품코드`
- label type
- size in mm
- printable text blocks
- style settings
- warning/footer options
- source type: matched workbook, manually edited, or newly created
- saved timestamp

## Error Handling

If the matching workbook is unavailable or a drug has no matched row, the screen should still allow new label creation.

If multiple candidate labels exist, the selected candidate is shown in the canvas and can be saved as the drug default.

If imported metadata cannot be matched by `약품코드`, it should be reported as an unmatched import row instead of silently changing another drug.

## Testing And Documentation

Implementation should add tests around matching priority, saved-label precedence, metadata sync by `약품코드`, and batch print page grouping.

If implementation changes data import flow, generated data shape, or source-file rules, update `docs/SYSTEM_MAPPING.md` as required by the repository instructions.
