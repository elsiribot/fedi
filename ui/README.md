# Fedi Client

The Fedi client codebase is a Yarn workspace that's split between 3 projects:

| `common` | Shared constants, utilities, and types between all clients |
| `native` | A `react-native` based native app for Android and iOS |
| `web` | A `next` based progressive web app for desktop and mobile web |

## Setup

```bash
# Install dependencies
yarn install
```

## Running commands

You can either run commands by `cd`ing into the correct directory and running
them there, or you can use `yarn workspace` to target the project.

```bash
# Doing this...
cd web
yarn dev

# Is the same as this
yarn workspace @fedi/web dev
```

## Adding new packages

To install a new package, go to each project that needs it and run `yarn add ...`
for the package in each. For packages that are shared across multiple projects,
please try to keep the versions synchronized between all projects. You can check
if they're synced by running:

```bash
yarn run syncpack
```

If there are any mismatches, you can fix that by running

```bash
yarn run syncpack fix-mismatches
```

which will upgrade all projects to use the highest version of the dependency.

### Hoisting

All packages are hoisted up into `ui/node_modules`, even if only a
single module uses them.
