#!/usr/bin/env python3
"""Compile a .po file into a .mo file (pure Python fallback).

Usage: python scripts/po_to_mo.py [PO_PATH]
If no path given, defaults to `locale/zh_CN/LC_MESSAGES/django.po`.
"""
import os
import sys
import struct
import ast

def unquote(s):
    s = s.strip()
    # find first quote
    i = s.find('"')
    if i >= 0:
        return ast.literal_eval(s[i:])
    return ''

def parse_po(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    entries = []
    cur = None
    state = None
    for ln in lines:
        ln = ln.rstrip('\n')
        if ln.startswith('msgid '):
            if cur is not None:
                entries.append(cur)
            cur = {'msgid': unquote(ln), 'msgstr': ''}
            state = 'msgid'
        elif ln.startswith('msgstr '):
            if cur is None:
                cur = {'msgid': '', 'msgstr': ''}
            cur['msgstr'] = unquote(ln)
            state = 'msgstr'
        elif ln.startswith('"') and cur is not None:
            more = unquote(ln)
            if state == 'msgid':
                cur['msgid'] += more
            elif state == 'msgstr':
                cur['msgstr'] += more
        elif ln.strip() == '':
            if cur is not None:
                entries.append(cur)
                cur = None
                state = None
        else:
            # comment or other - ignore
            pass
    if cur is not None:
        entries.append(cur)
    catalog = {}
    for e in entries:
        k = e.get('msgid', '')
        v = e.get('msgstr', '')
        if k and v is not None:
            catalog[k] = v
    return catalog

def write_mo(catalog, outpath):
    ids = sorted(catalog.keys())
    # prepare binary pools
    id_blob = b''.join([s.encode('utf-8') + b'\x00' for s in ids])
    str_blob = b''.join([catalog[s].encode('utf-8') + b'\x00' for s in ids])
    n = len(ids)
    # header: magic, revision, n, off_ids, off_strs, hash_size, hash_offset
    # header size = 7 * 4 = 28
    off_ids = 28
    off_strs = off_ids + n * 8
    off_bodies = off_strs + n * 8
    # compute id offsets
    id_offsets = []
    cur = off_bodies
    for s in ids:
        b = s.encode('utf-8') + b'\x00'
        id_offsets.append((len(b)-1, cur))
        cur += len(b)
    str_offsets = []
    for s in ids:
        b = catalog[s].encode('utf-8') + b'\x00'
        str_offsets.append((len(b)-1, cur))
        cur += len(b)
    # write
    with open(outpath, 'wb') as f:
        f.write(struct.pack('Iiiiiii', 0x950412de, 0, n, off_ids, off_strs, 0, 0))
        for l, o in id_offsets:
            f.write(struct.pack('ii', l, o))
        for l, o in str_offsets:
            f.write(struct.pack('ii', l, o))
        for s in ids:
            f.write(s.encode('utf-8') + b'\x00')
        for s in ids:
            f.write(catalog[s].encode('utf-8') + b'\x00')

def main():
    if len(sys.argv) > 1:
        po = sys.argv[1]
    else:
        po = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'locale', 'zh_CN', 'LC_MESSAGES', 'django.po')
    if not os.path.exists(po):
        print('PO file not found:', po)
        return
    catalog = parse_po(po)
    mo = os.path.splitext(po)[0] + '.mo'
    write_mo(catalog, mo)
    print('Wrote MO:', mo)

if __name__ == '__main__':
    main()
