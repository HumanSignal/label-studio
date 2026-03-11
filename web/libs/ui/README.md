# Spark: HumanSignal UI Library

Based on Tailwind and Shadcn. Still WIP with the Design System, so refer to official docs for now:

- [Tailwind](https://tailwindcss.com/docs/installation/using-vite)
- [Shadcn](https://ui.shadcn.com/docs/components/accordion)

## Running unit tests

Run `yarn nx test ui` to execute the unit tests via [Jest](https://jestjs.io).

## Running Storybook

Run `yarn nx serve ui` to run the Storybook development server on http://localhost:4400

## Contribution Guidelines

*NOTE:* This project is a WIP

We will be following the standards encapsulated within the nx workflows established within the monorepo and everything will follow the same pattern of development governed by nx generators.

### Creating a component

Run the following generator to create your new component

```shell
yarn nx generate @nx/react-component <Component> --project ui
# example. yarn nx generate @nx/react-component Button --project ui
```

This will automatically generate a scaffold of the following:

`./src/lib/button/`
- `button.tsx`
- `button.module.css`
- `button.stories.tsx`
- `button.spec.tsx`

### Migrating an existing component

1. Perform the same step to creating a component for the component in question, continuing with the theme we'll use `Button` as an example.

2. Find all current definitions within the project that would require to be replaced, take the consolidated version of the existing component and place the current CSS and TSX within the generated file equivalents from the previous step. (NOTE: Ensure to keep the new CSS module styles import, replacing the old one that may have been copied over)

3. Remove any `bem.tsx` imports

4. Replace the BEM components used with standard jsx tags.

5. Add the className's from the CSS module styles object based on the same BEM structure previously found. (NOTE: Ensure that conditionals/modifiers are handled correctly)

6. Add the component stories to the generated `button.stories.tsx` file.

7. Add the component tests to the generated `button.spec.tsx` file.

8. Find and replace all usages within the codebase with your new `Button` component 😎.
