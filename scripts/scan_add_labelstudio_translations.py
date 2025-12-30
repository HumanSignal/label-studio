#!/usr/bin/env python3
"""Scan web/apps/labelstudio/src for JSX text and attribute strings, add to en translation.json.

This script will:
 - Walk `web/apps/labelstudio/src` for .jsx files
 - Extract candidate English strings from JSX text nodes and common attributes
 - Generate stable keys and add them to `web/locales/en/translation.json` if missing
 - Print a summary of added keys

Note: it does NOT modify source files to use i18n; that can be done after translations are reviewed.
"""
import re
import json
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'web' / 'apps' / 'labelstudio' / 'src'
EN = ROOT / 'web' / 'locales' / 'en' / 'translation.json'

ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'tooltip', 'label', 'tooltipText', 'ariaLabel']


def load_json(p: Path):
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding='utf-8'))


def save_json(p: Path, data: dict):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=4) + '\n', encoding='utf-8')


def make_key(text: str, relpath: str) -> str:
    # basic stable key: use path + hash of text
    base = relpath.replace('/', '.').replace('\\', '.')
    h = hashlib.sha1(text.encode('utf-8')).hexdigest()[:8]
    # shorten text to first words
    short = re.sub(r'[^a-z0-9]+', '_', text.lower())[:40].strip('_')
    return f'{base}.{short}.{h}'


def is_candidate(s: str) -> bool:
    s = s.strip()
    if not s:
        return False
    # exclude code-like strings
    if any(tok in s for tok in ('{', '}', '<', '>', '=>', 'function', 'import', 'http://', 'https://')):
        return False
    # exclude long code-like paths
    if len(s) > 200:
        return False
    # require at least one letter
    if not re.search(r'[A-Za-z]', s):
        return False
    return True


def extract_from_content(content: str):
    found = set()
    # attributes
    for attr in ATTRS:
        # match attr="..." or attr='...'
        for m in re.finditer(rf'{attr}\s*=\s*(?:"([^"]{{1,200}})"|\'([^\']{{1,200}})\')', content):
            val = m.group(1) or m.group(2)
            if val and is_candidate(val):
                found.add(val.strip())
    # JSX text nodes: > ... <
    for m in re.finditer(r'>\s*([^<>\n]{{1,200}}?)\s*<', content):
        val = m.group(1).strip()
        # ignore single characters or punctuation
        if len(val) < 2:
            continue
        # ignore if looks like a JS expression
        if val.startswith('{') or val.endswith('}'): 
            continue
        if is_candidate(val):
            found.add(val)
    return found


def main():
    en = load_json(EN)
    added = {}
    files = list(SRC.rglob('*.jsx'))
    for f in files:
        rel = f.relative_to(ROOT / 'web').as_posix()
        content = f.read_text(encoding='utf-8')
        candidates = extract_from_content(content)
        for txt in sorted(candidates):
            # skip if already present
            if txt in en.values():
                continue
            key = make_key(txt, rel)
            # ensure unique key
            if key in en:
                # unlikely, but append suffix
                key = key + '_' + hashlib.sha1(txt.encode('utf-8')).hexdigest()[:6]
            en[key] = txt
            added[key] = txt

    if added:
        save_json(EN, en)

    print(f'Scanned {len(files)} .jsx files, added {len(added)} keys')
    for k, v in list(added.items())[:200]:
        print(k, '=>', v)


if __name__ == '__main__':
    main()
