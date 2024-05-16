import json
import subprocess

biome_file_path = 'biome.json'

def get_number_of_errors():
    result = subprocess.run(['yarn', 'biome', 'check', '.'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    # Extract the number of errors from the command output
    for line in result.stdout.split('\n'):
        if 'Found' in line and 'error' in line:
            return int(line.split(' ')[1])
    return 0

# Read the biome.json file
with open(biome_file_path, 'r') as file:
    biome_data = json.load(file)

results = []

rules = biome_data['linter']['rules']

def process_rules(rules, parent_keys=[]):
    keys_to_process = list(rules.keys())
    for key in keys_to_process:
        value = rules[key]
        if isinstance(value, dict):
            process_rules(value, parent_keys + [key])
        else:
            original_value = rules.pop(key)

            with open(biome_file_path, 'w') as file:
                json.dump(biome_data, file, indent=4)

            errors = get_number_of_errors()

            results.append({
                'rule_path': ' > '.join(parent_keys + [key]),
                'errors': errors
            })

            rules[key] = original_value

            with open(biome_file_path, 'w') as file:
                json.dump(biome_data, file, indent=4)

process_rules(rules)

for result in results:
    print(f"Rule: {result['rule_path']}, Errors: {result['errors']}")

subprocess.run(['git', 'checkout', '--', biome_file_path])
