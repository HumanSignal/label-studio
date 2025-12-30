#!/usr/bin/env python3
try:
    import googletrans
    print('googletrans imported, version=', getattr(googletrans, '__version__', None))
except Exception as e:
    print('import error:', e)
    raise
