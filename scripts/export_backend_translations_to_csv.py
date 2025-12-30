#!/usr/bin/env python3
"""Export extracted backend messages (auto draft if available) to a CSV for human review.

Usage: python scripts/export_backend_translations_to_csv.py
Writes: web/locales/backend_translations_review.csv
"""
import json
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRA_AUTO = ROOT / 'web' / 'locales' / 'extracted_backend_messages_zh-CN.auto.json'
EXTRA = ROOT / 'web' / 'locales' / 'extracted_backend_messages.json'
OUT = ROOT / 'web' / 'locales' / 'backend_translations_review.csv'


def load_messages():
    if EXTRA_AUTO.exists():
        data = json.loads(EXTRA_AUTO.read_text(encoding='utf-8'))
        msgs = data.get('messages', {})
        # each value may have msgid/msgstr/occurrences
        out = {}
        for k, v in msgs.items():
            msgid = v.get('msgid', k)
            msgstr = v.get('msgstr', '')
            occ = v.get('occurrences', [])
            out[msgid] = {'msgstr': msgstr, 'occurrences': occ}
        return out

    if EXTRA.exists():
        data = json.loads(EXTRA.read_text(encoding='utf-8'))
        msgs = data.get('messages', {})
        out = {}
        for k, v in msgs.items():
            out[k] = {'msgstr': '', 'occurrences': v.get('occurrences', [])}
        return out

    return {}


def write_csv(messages):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open('w', encoding='utf-8', newline='') as fh:
        writer = csv.writer(fh)
        writer.writerow(['msgid', 'msgstr', 'occurrences', 'notes'])
        for msgid, meta in sorted(messages.items()):
            occ = ';'.join(meta.get('occurrences', []))
            writer.writerow([msgid, meta.get('msgstr', ''), occ, ''])
    print('Wrote', OUT)


def main():
    msgs = load_messages()
    if not msgs:
        print('No messages found to export.')
        return
    write_csv(msgs)


if __name__ == '__main__':
    main()
