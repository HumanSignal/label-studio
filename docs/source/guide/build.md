---
title: Build
type: guide
order: 102
---

Clone the repository and install all dependencies:

```bash
git clone git@github.com:heartexlabs/label-studio.git
cd label-studio
npm install
```

Now you can make any changes to the code or add your custom tags.

## Development

```bash
npm run start
```

And open your browser at http://localhost:3000

A good introduction point is to study `src/env/development.js`. That file defines a labeling config for the studio as well as creates the environment.

## Production

```bash
npm run publish
```

Generates the compiled version of label studio. Output files are store in `build`. This compiled version needs to be included in your app. For an example on how to include the files checkout the `backend/server.py` file `index` method.

## Embed

The easiest way to embed Label Studio into your application is to re-use the initialization code from `backend/templates/index.html`. 

## Extend

```
TBD
```
