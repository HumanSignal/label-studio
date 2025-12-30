#!/usr/bin/env python3
"""Online EN->ZH batch translator for frontend translation JSON.

Uses `googletrans` to translate untranslated entries (those without Chinese chars)
and writes drafts to `web/locales/zh-CN/translation.auto.json` and updates
`web/locales/zh-CN/translation.json` (overwriting untranslated entries),
then exports `web/locales/frontend_translations_review.csv`.
"""
import time
import json
import re
from pathlib import Path

try:
    from googletrans import Translator
except Exception:
    raise SystemExit("googletrans not installed; run `pip install googletrans==4.0.0-rc1` and retry")

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / 'web' / 'locales' / 'en' / 'translation.json'
ZH_PATH = ROOT / 'web' / 'locales' / 'zh-CN' / 'translation.json'
AUTO_PATH = ROOT / 'web' / 'locales' / 'zh-CN' / 'translation.auto.json'
CSV_OUT = ROOT / 'web' / 'locales' / 'frontend_translations_review.csv'

def load_json(p: Path):
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding='utf-8'))

def save_json(p: Path, data: dict):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=4) + '\n', encoding='utf-8')

def has_chinese(s: str) -> bool:
    return bool(re.search('[\u4e00-\u9fff]', str(s)))

def main():
    en = load_json(EN_PATH)
    zh = load_json(ZH_PATH)
    translator = Translator()

    auto = {}
    to_translate = []
    for k, ev in en.items():
        zv = zh.get(k, '')
        if not zv or zv == ev or not has_chinese(zv):
            to_translate.append((k, ev))

    print(f'Found {len(to_translate)} keys to translate')
    for i, (k, ev) in enumerate(to_translate, 1):
        try:
            # Respectful pacing
            time.sleep(0.5)
            tr = translator.translate(ev, dest='zh-cn')
            txt = tr.text
            zh[k] = txt
            auto[k] = txt
            print(f'[{i}/{len(to_translate)}] {k} -> {txt}')
        except Exception as e:
            print(f'[{i}/{len(to_translate)}] FAILED {k}:', e)
            # leave English in place for manual review
            zh.setdefault(k, ev)

    save_json(ZH_PATH, zh)
    save_json(AUTO_PATH, auto)

    # export CSV
    import csv
    with CSV_OUT.open('w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['key', 'english', 'chinese'])
        for k in sorted(en.keys()):
            writer.writerow([k, en.get(k, ''), zh.get(k, '')])

    print(f'Auto-translated {len(auto)} keys to {ZH_PATH} (draft saved in {AUTO_PATH})')
    print(f'Wrote CSV: {CSV_OUT}')

if __name__ == '__main__':
    main()
