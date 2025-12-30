#!/usr/bin/env python3
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN = ROOT / 'web' / 'locales' / 'en' / 'translation.json'
ZH = ROOT / 'web' / 'locales' / 'zh-CN' / 'translation.json'
CSV_IN = ROOT / 'web' / 'locales' / 'frontend_translations_review.csv'


def load_json(p: Path):
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding='utf-8'))


def save_json(p: Path, data: dict):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n", encoding='utf-8')


def apply_csv(csv_path: Path, zh: dict):
    if not csv_path.exists():
        print(f'CSV not found: {csv_path}')
        return 0
    updated = 0
    with csv_path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row.get('key') or row.get('Key')
            chinese = row.get('chinese') or row.get('Chinese') or ''
            if not key:
                continue
            if chinese and zh.get(key, '').strip() != chinese.strip():
                zh[key] = chinese
                updated += 1
    return updated


def merge_missing_from_en(en: dict, zh: dict):
    added = 0
    for k, v in en.items():
        if k not in zh:
            zh[k] = v
            added += 1
    return added


def main():
    en = load_json(EN)
    zh = load_json(ZH)

    # Apply CSV translations
    updated = apply_csv(CSV_IN, zh)
    print(f'Applied {updated} translations from CSV')

    # Merge missing keys from en as placeholders
    added = merge_missing_from_en(en, zh)
    print(f'Added {added} missing keys from en as placeholders')

    save_json(ZH, zh)
    print(f'Wrote {ZH}')


if __name__ == '__main__':
    main()
