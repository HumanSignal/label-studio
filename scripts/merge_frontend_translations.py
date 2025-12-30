#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN = ROOT / 'web' / 'locales' / 'en' / 'translation.json'
ZH = ROOT / 'web' / 'locales' / 'zh-CN' / 'translation.json'
CSV_OUT = ROOT / 'web' / 'locales' / 'frontend_translations_review.csv'


def load(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding='utf-8'))


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n", encoding='utf-8')


def main():
    en = load(EN)
    zh = load(ZH)

    added = 0
    for k, v in en.items():
        if k not in zh:
            zh[k] = v  # placeholder: copy English so translators have context
            added += 1

    save_json(ZH, zh)

    # Export CSV of all keys for translators (key, english, chinese)
    import csv
    with CSV_OUT.open('w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['key', 'english', 'chinese'])
        for k in sorted(en.keys()):
            writer.writerow([k, en.get(k, ''), zh.get(k, '')])

    print(f'Wrote {ZH} ({added} new keys added)')
    print(f'Wrote CSV: {CSV_OUT}')


if __name__ == '__main__':
    main()
