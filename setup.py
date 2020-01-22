import setuptools

# Package version
version = '0.4.4.post1'

# Readme
with open('README.md', 'r') as f:
    long_description = f.read()

# Module dependencies
with open('requirements.txt') as f:
    requirements = f.read().splitlines()

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
    include_package_data=True,
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    install_requires=requirements,
    python_requires='>=3.5',
    entry_points={
        'console_scripts': ['label-studio=label_studio.server:main'],
    }
)
