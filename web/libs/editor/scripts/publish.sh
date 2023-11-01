#!/bin/bash

# TODO all steps will be executed even if some steps will fail

if [ -z $1 ]; then
  echo "Provide a new version as a first argument"
  exit 1
fi

VERSION=$1
COMPANY="heartexlabs"
REPO="label-studio"

# Colors for colored output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Just to be sure
git pull

# Create new build
rm -rf build
yarn build:module
rm build/.gitignore

# Replace links to published files in README to the actual one
# `ls -tU` sorts files by creation date (recent is first)
# `head -1` gets the first one (the recent)
sed -E -e "s/main\..*js/$(cd build/static/js && ls -tU *.js | head -1)/"\
       -e "s/main\..*css/$(cd build/static/css && ls -tU *.css | head -1)/"\
       -e "s/[0-9]\.[0-9]+\.[0-9]+/$VERSION/"\
       -i '' README.md
git add README.md

# Patch version
sed -E -e "s/^  \"version\".*$/  \"version\": \"$VERSION\",/" -i '' package.json package-lock.json
git add package.json package-lock.json

echo && echo -e "${GREEN}### README and package.json modified successfully${NC}" && echo

# Create release commit and tag and push them
git commit -m "$VERSION"
git tag v$VERSION

git push
git push origin v$VERSION

echo && echo -e "${GREEN}### Release commit and tag pushed to github${NC}" && echo

# Remove prepublish step because we are using custom script
sed -E -e "s/^ *\"prepublishOnly\".*$//" -i '' package.json

# Authenticate within npmjs.com using Access Token from NPMJS_TOKEN
echo "//registry.npmjs.org/:_authToken=${NPMJS_TOKEN}" > ".npmrc"

# Publish the package
npm publish

echo && echo -e "${GREEN}### NPM package published${NC}" && echo

# GitHub Packages requires scoped @company/repo name
sed -E -e "s/^  \"name\".*$/  \"name\": \"@$COMPANY\/$REPO\",/" -i '' package.json

# Authenticate within Github Packages using Personal Access Token
echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" > ".npmrc"

# Publish the package
npm publish --registry=https://npm.pkg.github.com/

echo && echo -e "${GREEN}### GitHub package published${NC}" && echo

# Restore modified files
git checkout -- package.json package-lock.json

# clean up
rm -rf build
