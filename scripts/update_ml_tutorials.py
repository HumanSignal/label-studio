"""
The script does the following:

1. Downloads all README.md files in the label-studio-ml repository https://github.com/HumanSignal/label-studio-ml-backend by path label_studio_ml/examples/{model_name}/README.md
2. Parses the README.md files to extract the following information:
- HEADER: enclosed in `---` (e.g. `---\n Header Content \n---`)
- BODY: The rest of the content after header
3. For each `model_name` in the label-studio-ml repository, it creates a new file in the docs/source/tutorials copying the README.md content
4. Additionally, it changes the file in docs/source/guide/ml_tutorials.html, adding HEADER as a new item in `cards` list:
    ---
    section: "Machine learning"
    meta_title: Machine Learning Example Tutorials
    meta_description: Tutorial documentation for setting up a machine learning model with predictions using PyTorch, GPT2, Sci-kit learn, and other popular frameworks.
    layout: templates
    cards:
    - title: Create a simple ML backend
      categories:
      - image classification
      - starter
      image: "/tutorials/simple-image-classification.png"
      url: "/tutorials/dummy_model.html"
    - title: ...
    ---
"""

import logging
import os
import re
from pathlib import Path
from typing import List

import yaml

ML_REPO_PATH = os.getenv('ML_REPO_PATH', '/ml/')


def get_readme_files() -> List:
    p = Path(ML_REPO_PATH) / 'label_studio_ml' / 'examples'
    return sorted(list(Path(p).rglob('README.md')))


def parse_readme_file(file_path: str) -> dict:
    print(file_path)
    with open(file_path, 'r') as f:
        content = f.read()

    match = re.search(r'---(.*?)---', content, re.DOTALL)
    header = match.group(1).strip() if match else ''
    body = content[content.find('-->') + 3 :].strip()

    return {'header': header, 'body': body}


def create_tutorial_files():
    readme_files = get_readme_files()

    files_and_headers = []
    for file in readme_files:
        model_name = file.parts[-2]
        tutorial_path = Path(__file__).resolve().parent.parent / 'docs' / 'source' / 'tutorials' / f'{model_name}.md'
        tutorial_dir = os.path.dirname(tutorial_path)
        os.makedirs(tutorial_dir, exist_ok=True)

        parsed_content = parse_readme_file(file)
        with open(tutorial_path, 'w') as f:
            if parsed_content['header']:
                f.write('---\n')
                f.write(parsed_content['header'])
                f.write('\n---\n\n')
            f.write(parsed_content['body'])
        files_and_headers.append(
            {'model_name': model_name, 'header': yaml.load(parsed_content['header'], Loader=yaml.FullLoader)}
        )

    update_ml_tutorials_index(files_and_headers)


def update_ml_tutorials_index(files_and_headers: List):
    # Navigate to '../docs/source/guide/ml_tutorials.html' relative to the current script
    p = Path(__file__).resolve().parent.parent / 'docs' / 'source' / 'guide' / 'ml_tutorials.html'
    print(f'Reading file from {str(p)}')
    with open(str(p), 'r') as f:
        content = f.read()

    yaml_content = re.findall(r'---\n(.*?)\n---', content, re.DOTALL)
    # read in python dict
    data = yaml.load(yaml_content[0].strip(), Loader=yaml.FullLoader)
    data['cards'] = []
    print(data)
    for f in files_and_headers:
        h = f['header']
        if not isinstance(h, dict):
            logging.error(f'No dict header found in {f} file. Skipping ...')
            continue
        print('Processing', f['model_name'])
        card = {'title': h.get('title') or f['model_name'], 'url': f'/tutorials/{f["model_name"]}.html'}
        card.update(h)
        data['cards'].append(card)

    p = Path(__file__).resolve().parent.parent / 'docs' / 'source' / 'guide' / 'ml_tutorials.html'
    print(f'Updating {str(p)} ... ')
    with open(str(p), 'w') as f:
        f.write('---\n')
        f.write(yaml.dump(data))
        f.write('---\n')


create_tutorial_files()
