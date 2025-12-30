import json, re, sys
p = 'web/locales/zh-CN/translation.json'
try:
    with open(p, 'r', encoding='utf-8') as f:
        d = json.load(f)
except Exception as e:
    print('ERROR loading', p, e)
    sys.exit(1)
pat = re.compile('[\u4e00-\u9fff]')
un = [k for k, v in d.items() if not pat.search(str(v))]
print('TOTAL', len(d))
print('UNTRANSLATED', len(un))
for k in un[:200]:
    print(k)
