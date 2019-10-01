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

## Run a development build

```bash
npm run start
```

And open your browser at http://localhost:3000

A good introduction point is to study `src/env/development.js`. That file defines a labeling config for the studio as well as creates the environment.

## Run a production build

```bash
npm run publish
```

Generates the compiled version of label studio. This compiled version needs to be included in your app.

## Embed

The easiest way to embed Label Studio into your application is to re-use the initialization code from `backend/templates/index.html`. 

## Extend

```
TBD
```
