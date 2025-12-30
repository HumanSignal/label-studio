#!/usr/bin/env python3
"""Optional auto-translate script using `googletrans`.

This script attempts to translate extracted_backend_messages.json to zh-CN
using the `googletrans` package. Install with:

  pip install googletrans==4.0.0-rc1

Then run:

  python scripts/auto_translate_backend_messages.py

If network or package is unavailable, the script will exit with instructions.
"""
import os
import json
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
IN_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages.json')
OUT_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages_zh-CN.auto.json')

def main():
    try:
        from googletrans import Translator
    except Exception as e:
        print('googletrans not available. Install with: pip install googletrans==4.0.0-rc1')
        sys.exit(1)

    if not os.path.exists(IN_PATH):
        print('Input file not found:', IN_PATH)
        sys.exit(1)

    with open(IN_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    msgs = list(data.get('messages', {}).keys())
    translator = Translator()

    translated = {}
    # batch translate in chunks
    chunk = 50
    for i in range(0, len(msgs), chunk):
        batch = msgs[i:i+chunk]
        print('Translating batch', i, '->', i+len(batch))
        results = translator.translate(batch, dest='zh-cn')
        for src, res in zip(batch, results):
            translated[src] = res.text

    out = {'messages': {}}
    for k, meta in data.get('messages', {}).items():
        out['messages'][k] = {
            'msgid': k,
            'msgstr': translated.get(k, ''),
            'occurrences': meta.get('occurrences', [])
        }

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('Wrote auto-translated file:', OUT_PATH)

if __name__ == '__main__':
    main()
