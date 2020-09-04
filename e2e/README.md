# E2E tests for label-studio

## Usage

First of all you have to install npm packages
```sh
npm i
# or yarn
```

Then you can run tests and see what happens with 
```sh
npm test
# or yarn test
```

First the server will start and init new test project `_e2e_project`.
Script will wait for 2 seconds to let the server start.
Then Chroium will pop out and you'll see everything happens step by step,
but very quickly.

For CI and hidden run in background you should use
```sh
npm run test:headless
# or yarn test:headless
```

## Development

All tests are powered by Codecept.js runner with Chromium run by Puppeteer.
Every test starts with `Feature("name your feature")` followed by scenarios
```js
Scenario("Show happy opossum on first run", I => {
  I.amOnPage("/");
  I.see("Opossum");
  I.click("Start");
})
```

which describe actions and asserts. Almost all the available things
inside `I` facade. Full list of helper functions you can found on
[https://codecept.io/helpers/Puppeteer/].

If you want to debug scenario, add `pause()` anywhere you need and run test
in usual non-headless way. At the point with `pause` the test will stop and
 wait for you with interacive shell.

On error screenshot named after scenario will be added to `output` dir.

