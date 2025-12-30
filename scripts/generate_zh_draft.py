#!/usr/bin/env python3
"""Generate a zh-CN draft JSON for backend gettext messages.

Reads `web/locales/extracted_backend_messages.json` and writes
`web/locales/extracted_backend_messages_zh-CN.draft.json` where each
message has an empty `msgstr` for translators to fill.
"""
import os
import json

ROOT = os.path.dirname(os.path.dirname(__file__))
IN_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages.json')
OUT_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages_zh-CN.draft.json')

def main():
    if not os.path.exists(IN_PATH):
        print('Input file not found:', IN_PATH)
        return
    with open(IN_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    msgs = data.get('messages', {})
    out = {'messages': {}}
    for msg, meta in sorted(msgs.items()):
        out['messages'][msg] = {
            'msgid': msg,
            'msgstr': "",
            'occurrences': meta.get('occurrences', [])
        }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('Wrote draft:', OUT_PATH)

if __name__ == '__main__':
    main()
