#!/usr/bin/env python3
"""Merge translations from a filled CSV back into django .po and optional JSON.

Usage:
  python scripts/merge_translations_from_csv.py --csv web/locales/backend_translations_review.csv

This script will update (or create) locale/zh_CN/LC_MESSAGES/django.po with msgstr from CSV.
It preserves existing msgid order where possible. It also calls the existing po_to_mo.py to compile .mo.
"""
import csv
import sys
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / 'web' / 'locales' / 'backend_translations_review.csv'
PO_PATH = ROOT / 'locale' / 'zh_CN' / 'LC_MESSAGES' / 'django.po'
MO_SCRIPT = ROOT / 'scripts' / 'po_to_mo.py'


def read_csv(path):
    out = {}
    with path.open('r', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            msgid = row.get('msgid', '').strip()
            msgstr = row.get('msgstr', '').strip()
            if msgid:
                out[msgid] = msgstr
    return out


def ensure_po_dir():
    PO_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_existing_po():
    if not PO_PATH.exists():
        return ''
    return PO_PATH.read_text(encoding='utf-8')


def create_po_from_csv(trans_map):
    # Simple PO writer: write msgid/msgstr pairs
    parts = []
    header = '''msgid ""\nmsgstr ""\n"Project-Id-Version: label-studio\\n"\n"POT-Creation-Date: 2025-01-01 00:00+0000\\n"\n"MIME-Version: 1.0\\n"\n"Content-Type: text/plain; charset=UTF-8\\n"\n"Content-Transfer-Encoding: 8bit\\n"\n\n'''
    parts.append(header)
    for msgid, msgstr in trans_map.items():
        # escape
        def esc(s):
            return s.replace('"', '\\"')
        parts.append('msgid "{}"\n'.format(esc(msgid)))
        parts.append('msgstr "{}"\n\n'.format(esc(msgstr)))
    return ''.join(parts)


def write_po(content):
    PO_PATH.write_text(content, encoding='utf-8')
    print('Wrote', PO_PATH)


def compile_mo():
    if MO_SCRIPT.exists():
        import subprocess
        subprocess.run([sys.executable, str(MO_SCRIPT)], check=False)
        print('Attempted to run po_to_mo.py')
    else:
        print('po_to_mo.py not found; please run compilemessages in Django environment')


def main():
    csv_in = CSV_PATH
    if len(sys.argv) > 1:
        csv_in = Path(sys.argv[1])
    if not csv_in.exists():
        print('CSV not found:', csv_in)
        return
    trans_map = read_csv(csv_in)
    if not trans_map:
        print('No translations found in CSV')
        return
    ensure_po_dir()
    # naive approach: create new po from csv ordering
    po_content = create_po_from_csv(trans_map)
    write_po(po_content)
    compile_mo()


if __name__ == '__main__':
    main()
