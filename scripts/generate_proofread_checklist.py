#!/usr/bin/env python3
"""Generate a proofreading checklist from auto-translated JSON.

Writes `web/locales/backend_proofread_checklist.md` listing messages that:
- have empty `msgstr`
- or have `msgstr` that still contains ASCII letters (likely untranslated or mixed)
"""
import os
import json
import re

ROOT = os.path.dirname(os.path.dirname(__file__))
IN_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages_zh-CN.auto.json')
OUT_PATH = os.path.join(ROOT, 'web', 'locales', 'backend_proofread_checklist.md')

def suspicious(msgstr, msgid):
    if not msgstr:
        return True
    # if msgstr equals msgid (case-insensitive) -> untranslated
    if msgstr.strip().lower() == msgid.strip().lower():
        return True
    # if msgstr contains ASCII letters (English words) more than 3 chars
    if re.search(r'[A-Za-z]{3,}', msgstr):
        return True
    return False

def main():
    if not os.path.exists(IN_PATH):
        print('Input not found:', IN_PATH)
        return
    with open(IN_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    msgs = data.get('messages', {})
    empties = []
    mixed = []
    for msgid, meta in msgs.items():
        msgstr = meta.get('msgstr', '') if isinstance(meta, dict) else ''
        if msgstr == '' or msgstr is None:
            empties.append((msgid, meta.get('occurrences', [])))
        else:
            if suspicious(msgstr, msgid):
                mixed.append((msgid, msgstr, meta.get('occurrences', [])))

    lines = []
    lines.append('# 后端翻译校对清单')
    lines.append('生成自 `web/locales/extracted_backend_messages_zh-CN.auto.json`。')
    lines.append('')
    lines.append('## 一：空翻译（需要人工翻译）')
    lines.append('')
    for msgid, occ in empties:
        occ_str = ', '.join(occ[:3]) + (' ...' if len(occ) > 3 else '')
        lines.append('- **%s**' % msgid)
        lines.append('  Occurrences: %s' % occ_str)
    lines.append('')
    lines.append('## 二：可疑翻译（含英文或部分未翻译—建议人工校对）')
    lines.append('')
    for msgid, msgstr, occ in mixed:
        occ_str = ', '.join(occ[:3]) + (' ...' if len(occ) > 3 else '')
        lines.append('- **%s** → `%s`' % (msgid, msgstr))
        lines.append('  Occurrences: %s' % occ_str)
    lines.append('')
    lines.append('---')
    lines.append('说明：自动翻译采用规则/在线工具，质量有限。校对时请优先处理空翻译与含英文的条目。')

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('Wrote checklist:', OUT_PATH)

if __name__ == '__main__':
    main()
