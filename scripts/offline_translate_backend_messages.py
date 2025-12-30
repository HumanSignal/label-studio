#!/usr/bin/env python3
"""Offline fallback translator: simple rule-based EN->ZH for extracted messages.

Not a replacement for real MT; provides a draft to speed up manual proofreading.
"""
import os
import json
import re

ROOT = os.path.dirname(os.path.dirname(__file__))
IN_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages.json')
OUT_PATH = os.path.join(ROOT, 'web', 'locales', 'extracted_backend_messages_zh-CN.auto.json')

# Minimal token dictionary (extendable)
DICT = {
    'created': '创建', 'created at': '创建于', 'updated': '更新', 'updated at': '更新于',
    'title': '标题', 'description': '描述', 'url': 'URL', 'webhook': 'Webhook', 'name': '名称',
    'email': '电子邮件', 'username': '用户名', 'password': '密码', 'token': '令牌',
    'created by': '创建者', 'finished at': '完成于', 'failed': '失败', 'completed': '已完成',
    'in progress': '进行中', 'all': '全部', 'allow': '允许', 'allow sending newsletters to user': '允许向用户发送简报',
    'annotation': '标注', 'annotations': '标注', 'annotation created': '已创建标注',
    'annotation updated': '标注已更新', 'annotation deleted': '标注已删除',
    'project': '项目', 'task': '任务', 'tasks': '任务', 'prediction': '预测', 'predictions': '预测',
    'score': '得分', 'result': '结果', 'result count': '结果数量', 'extra': '附加信息',
    'allow_skip': '允许跳过', 'overlap': '重叠', 'lead time': '耗时', 'expire_at': '过期时间',
}

def translate_phrase(s: str) -> str:
    s_strip = s.strip()
    low = s_strip.lower()
    # direct match
    if low in DICT:
        return DICT[low]
    # try some common patterns
    if ' (' in s_strip and s_strip.endswith(')'):
        base = s_strip.split(' (', 1)[0]
        trans_base = translate_phrase(base)
        suffix = s_strip.split(' (', 1)[1]
        return f"{trans_base} ({suffix})" if trans_base else s_strip
    # split by non-word
    parts = re.split(r"(\W+)", s_strip)
    out = []
    for p in parts:
        if re.match(r"\W+", p):
            out.append(p)
        else:
            t = DICT.get(p.lower())
            out.append(t if t is not None else p)
    res = ''.join(out)
    return res

def main():
    if not os.path.exists(IN_PATH):
        print('Input file not found:', IN_PATH)
        return
    with open(IN_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    msgs = data.get('messages', {})
    out = {'messages': {}}
    for k, meta in msgs.items():
        auto = translate_phrase(k)
        # fallback: if translation equals original, leave msgstr empty
        msgstr = auto if auto != k else ''
        out['messages'][k] = {
            'msgid': k,
            'msgstr': msgstr,
            'occurrences': meta.get('occurrences', [])
        }
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('Wrote offline auto-translation:', OUT_PATH)

if __name__ == '__main__':
    main()
