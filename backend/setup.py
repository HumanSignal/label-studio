import setuptools
import os
import io
import json

# Readme
with open('README.md', 'r') as f:
    long_description = f.read()

# Module dependencies
with open('requirements.txt') as f:
    requirements = f.read().splitlines()


# Sync module version with npm package version
version = '0.0.1'  # default version
package_file = os.path.join(os.path.dirname(__file__), '..', 'package.json')
if os.path.exists(package_file):
    with io.open(package_file) as f:
        info = json.load(f)
        version = info.get('version', version)

setuptools.setup(
    name='label-studio',
    version=version,
    author='Heartex',
    author_email="hello@heartex.ai",
    description='Label Studio annotation tool',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/heartexlabs/label-studio',
    packages=setuptools.find_packages(),
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    install_requires=requirements,
    python_requires='>=3.6',
    entry_points={
        'console_scripts': ['label-studio=label_studio.server:main_open_browser'],
    }
)