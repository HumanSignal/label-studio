#!/usr/bin/env python3
import os
import re
import json

ROOT = os.path.dirname(os.path.dirname(__file__))
SEARCH_DIRS = [os.path.join(ROOT, 'label_studio')]

PATTERNS = [
    re.compile(r"_\(\s*[uU]?[rR]?\"([^\"]+)\"\s*\)") ,
    re.compile(r"_\(\s*[uU]?[rR]?\'([^\']+)\'\s*\)") ,
    re.compile(r"gettext\(\s*[uU]?[rR]?\"([^\"]+)\"\s*\)") ,
    re.compile(r"gettext\(\s*[uU]?[rR]?\'([^\']+)\'\s*\)") ,
    re.compile(r"gettext_lazy\(\s*[uU]?[rR]?\"([^\"]+)\"\s*\)") ,
    re.compile(r"gettext_lazy\(\s*[uU]?[rR]?\'([^\']+)\'\s*\)") ,
    re.compile(r"ugettext_lazy\(\s*[uU]?[rR]?\"([^\"]+)\"\s*\)") ,
    re.compile(r"ugettext_lazy\(\s*[uU]?[rR]?\'([^\']+)\'\s*\)") ,
]

TEMPLATE_PATTERNS = [
    re.compile(r"\{%\s*trans\s+\"([^\"]+)\"\s*%\}"),
    re.compile(r"\{%\s*trans\s+'([^']+)'\s*%\}"),
]

def scan_file(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    found = []
    for p in PATTERNS:
        for m in p.finditer(text):
            msg = m.group(1).strip()
            if msg:
                found.append((msg, path))
    # template patterns
    for p in TEMPLATE_PATTERNS:
        for m in p.finditer(text):
            msg = m.group(1).strip()
            if msg:
                found.append((msg, path))
    return found

def walk_and_collect():
    messages = {}
    for base in SEARCH_DIRS:
        for dirpath, dirnames, filenames in os.walk(base):
            # skip migrations and static
            if 'migrations' in dirpath.split(os.sep):
                continue
            for fn in filenames:
                if not (fn.endswith('.py') or fn.endswith('.html') or fn.endswith('.txt')):
                    continue
                full = os.path.join(dirpath, fn)
                for msg, path in scan_file(full):
                    entry = messages.setdefault(msg, {'occurrences': []})
                    entry['occurrences'].append(os.path.relpath(path, ROOT).replace('\\', '/'))
    return messages

def main():
    msgs = walk_and_collect()
    out_dir = os.path.join(ROOT, 'web', 'locales')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'extracted_backend_messages.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({'messages': msgs}, f, ensure_ascii=False, indent=2)
    print('Wrote', out_file)

if __name__ == '__main__':
    main()
