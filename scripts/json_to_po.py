#!/usr/bin/env python3
"""Convert extracted_backend_messages JSON to a Django .po file.

Reads `web/locales/extracted_backend_messages_zh-CN.auto.json` (if present)
or `web/locales/extracted_backend_messages_zh-CN.draft.json` or
`web/locales/extracted_backend_messages.json` and writes
`locale/zh_CN/LC_MESSAGES/django.po` in project root.
"""
import os
import json
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(__file__))
POSSIBLE = [
    os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages_zh-CN.auto.json'),
    os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages_zh-CN.draft.json'),
    os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages.json'),
]

def load_messages():
    for p in POSSIBLE:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # data may be in different shapes
            msgs = {}
            if 'messages' in data:
                for k, v in data['messages'].items():
                    if isinstance(v, dict) and 'msgstr' in v:
                        msgs[k] = v.get('msgstr', '')
                    elif isinstance(v, dict) and 'occurrences' in v and 'msgid' in v:
                        msgs[k] = v.get('msgstr', '')
                    else:
                        # v is occurrences list
                        msgs[k] = ''
            else:
                # fallback: assume flat dict of msg->occurrences
                for k, v in data.items():
                    msgs[k] = ''
            return msgs, p
    return {}, None

def write_po(messages, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    header = [
        'msgid ""',
        'msgstr ""',
        '"Project-Id-Version: LABEL-STUDIO\\n"',
        f'"POT-Creation-Date: {datetime.utcnow().strftime("%Y-%m-%d %H:%M+0000") }\\n"',
        '"MIME-Version: 1.0\\n"',
        '"Content-Type: text/plain; charset=UTF-8\\n"',
        '"Content-Transfer-Encoding: 8bit\\n"',
        '"Language: zh_CN\\n"',
        '',
    ]
    lines = header[:]
    for msgid, msgstr in sorted(messages.items()):
        # escape quotes and backslashes
        esc_id = msgid.replace('\\', '\\\\').replace('"', '\\"')
        esc_str = (msgstr or '').replace('\\', '\\\\').replace('"', '\\"')
        lines.append(f'msgid "{esc_id}"')
        lines.append(f'msgstr "{esc_str}"')
        lines.append('')

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

def main():
    msgs, src = load_messages()
    if not msgs:
        print('No messages found to write .po')
        return
    out = os.path.join(ROOT, 'locale', 'zh_CN', 'LC_MESSAGES', 'django.po')
    write_po(msgs, out)
    print('Wrote PO from', src, '->', out)

if __name__ == '__main__':
    main()
