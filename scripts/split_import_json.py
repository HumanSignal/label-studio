"""This script splits IMPORT json with array into CHUNKS.
This can be useful to avoid problems with a large json file during the import step.
"""
import json
import sys

INPUT = 'import.json' if len(sys.argv) <= 1 else sys.argv[1]
OUTPUT = 'output' if len(sys.argv) <= 2 else sys.argv[2]
CHUNKS = 2 if len(sys.argv) <= 3 else int(sys.argv[3])
print('Usage: python ' + sys.argv[0] + ' import.json output 10')

if __name__ == '__main__':
    with open(INPUT) as f:
        j = json.load(f)

    total = len(j)
    chunk_size = int(total / float(CHUNKS))
    chunk_size = 1 if chunk_size < 1 else chunk_size

    start = 0
    count = 0
    while start < len(j):
        filename = OUTPUT + str(count) + '.json'
        print(filename, '<=', INPUT, '[', start, ':', start + chunk_size, ']')
        with open(filename, 'w') as out:
            json.dump(j[start : start + chunk_size], out)

        start += chunk_size
        count += 1
