import re

with open('src/types/database.ts', 'r') as f:
    content = f.read()

tables_match = re.search(r'Tables: \{(.*?)\n      \}\n      Views:', content, re.DOTALL)
if tables_match:
    tables_str = tables_match.group(1)
    # Find all top level keys
    tables = []
    depth = 0
    current = ""
    for char in tables_str:
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
        if depth == 1 and char != '{':
            current += char
        elif depth == 0 and current.strip():
            # grab the key name
            name = current.strip().split(':')[0]
            if name:
                tables.append(name.strip().strip("'\""))
            current = ""
    print("Tables:", tables)
