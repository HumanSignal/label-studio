#!/bin/bash

cat /etc/os-release
lsb_release -a

echo "=> Current dir:"
echo $PWD

echo "=> Install prerequisites..."
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.1/install.sh | bash
source ~/.bashrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm install node 14
nvm use 14
apt install unzip


echo "npm version:"
npm -v
echo "node version:"
node -v
echo "unzip version:"
unzip -v

echo "=> Installing npm packages..."
npm i node-fetch
