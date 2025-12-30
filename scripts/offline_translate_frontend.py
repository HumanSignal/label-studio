#!/usr/bin/env python3
"""Offline rule-based EN->ZH filler for frontend translation JSON.

Fills `web/locales/zh-CN/translation.json` for entries missing or equal to English,
writes a draft auto file `web/locales/zh-CN/translation.auto.json` and
exports `web/locales/frontend_translations_review.csv` with updated chinese column.
"""
import os
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / 'web' / 'locales' / 'en' / 'translation.json'
ZH_PATH = ROOT / 'web' / 'locales' / 'zh-CN' / 'translation.json'
AUTO_PATH = ROOT / 'web' / 'locales' / 'zh-CN' / 'translation.auto.json'
CSV_OUT = ROOT / 'web' / 'locales' / 'frontend_translations_review.csv'

DICT = {
    'create': '创建', 'created': '已创建', 'created at': '创建于', 'update': '更新', 'updated': '已更新',
    'delete': '删除', 'name': '名称', 'title': '标题', 'description': '描述', 'url': 'URL', 'email': '电子邮件',
    'project': '项目', 'projects': '项目', 'task': '任务', 'tasks': '任务', 'prediction': '预测', 'predictions': '预测',
    'settings': '设置', 'save': '保存', 'cancel': '取消', 'edit': '编辑', 'add': '添加', 'remove': '删除',
    'send': '发送', 'payload': '有效负载', 'webhook': 'Webhook', 'learn more': '了解更多',
}

def translate_phrase(s: str) -> str:
    s_strip = s.strip()
    low = s_strip.lower()
    if low in DICT:
        return DICT[low]
    # handle simple phrases and placeholders
    if '{' in s_strip or '}' in s_strip or '%' in s_strip:
        # keep placeholders intact, translate words around
        parts = re.split(r'(\{[^}]*\}|%\w+)', s_strip)
        out = []
        for p in parts:
            if not p:
                continue
            if p.startswith('{') or p.startswith('%'):
                out.append(p)
            else:
                out.append(''.join(DICT.get(w.lower(), w) for w in re.split(r'(\W+)', p)))
        return ''.join(out)
    parts = re.split(r'(\W+)', s_strip)
    out = []
    for p in parts:
        if re.match(r'\W+', p):
            out.append(p)
        else:
            out.append(DICT.get(p.lower(), p))
    res = ''.join(out)
    # if nothing changed, return empty to mark for manual translation
    return res if res != s_strip else ''


def load_json(p: Path):
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding='utf-8'))


def save_json(p: Path, data: dict):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=4) + '\n', encoding='utf-8')


def main():
    en = load_json(EN_PATH)
    zh = load_json(ZH_PATH)

    auto = {}
    changed = 0
    for k, ev in en.items():
        zv = zh.get(k, '')
        # consider untranslated if empty or identical to English
        if not zv or zv == ev or zv.strip() == '':
            candidate = translate_phrase(ev)
            if candidate:
                zh[k] = candidate
                auto[k] = candidate
                changed += 1
            else:
                # leave as english placeholder for manual translation
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

    print(f'Auto-filled {changed} keys to {ZH_PATH} (draft saved in {AUTO_PATH})')
    print(f'Wrote CSV: {CSV_OUT}')


if __name__ == '__main__':
    main()
