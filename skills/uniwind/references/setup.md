## Setup

### Installation

```bash
# or other package manager
bun install uniwind tailwindcss
```

Requires **Tailwind CSS v4+**.

### global.css

Create a CSS entry file:

```css
@import 'tailwindcss';
@import 'uniwind';
```

Import in your **App component** (e.g., `App.tsx` or `app/_layout.tsx`), **NOT** in `index.ts`/`index.js` — importing there breaks hot reload:

```tsx
// app/_layout.tsx or App.tsx
import './global.css';
```

The directory containing `global.css` is the app root — Tailwind scans for classNames starting from this directory.

### Metro Configuration

```js
const { getDefaultConfig } = require('expo/metro-config');
// Bare RN: const { getDefaultConfig } = require('@react-native/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// withUniwindConfig MUST be the OUTERMOST wrapper
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',           // Required — relative path from project root
  polyfills: { rem: 16 },                // Optional — base rem value (default 16)
  extraThemes: ['ocean', 'sunset'],       // Optional — custom themes beyond light/dark
  dtsFile: './uniwind-types.d.ts',        // Optional — TypeScript types output path
  debug: true,                            // Optional — log unsupported CSS in dev
  isTV: false,                            // Optional — enable TV platform support
});
```

For most flows, keep defaults, only provide `cssEntryFile`.

Wrapper order — Uniwind must wrap everything else:

```js
// CORRECT
module.exports = withUniwindConfig(withOtherConfig(config, opts), { cssEntryFile: './global.css' });

// WRONG — Uniwind is NOT outermost
module.exports = withOtherConfig(withUniwindConfig(config, { cssEntryFile: './global.css' }), opts);
```

### Platform entry files

A file named after a platform, sitting beside `cssEntryFile`, overrules it when Uniwind compiles for that platform — the same way Metro resolves `.ios` / `.native` modules. Keep pointing `cssEntryFile` at the base entry; the suffixed file is picked up behind it.

```
global.css          # the configured entry, and the fallback for every platform
global.web.css      # used on web instead
global.native.css   # used on iOS and Android instead
global.ios.css      # used on iOS, in preference to global.native.css
```

Suffixes are the platform variants Uniwind already generates — `ios`, `android`, `web`, `native`, `tv`, `android-tv`, `apple-tv` — so an entry is named after the prefix you would otherwise write inside it. Resolution is most-specific-first, and web never falls back to `native`.

Use it when a platform needs stylesheets the others must not get — web-only vendor CSS you override, for instance, which would otherwise be compiled into the native bundle as dead weight:

```css
/* global.web.css */
@import 'tailwindcss';
@import 'uniwind';
@import './vendor-overrides.css';
```

Each entry is compiled on its own, so every one of them must carry the full set of bare imports (`tailwindcss`, `uniwind`, …). Put the shared remainder in a file they both `@import`.

### Vite Configuration (v1.2.0+)

If user has storybook setup, add extra vite config:

```ts
import tailwindcss from '@tailwindcss/vite';
import { uniwind } from 'uniwind/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    uniwind({
      cssEntryFile: './src/global.css',
      dtsFile: './src/uniwind-types.d.ts',
    }),
  ],
});
```

### TypeScript

Uniwind auto-generates a `.d.ts` file (default: `./uniwind-types.d.ts`) after running Metro. Place it in `src/` or `app/` for auto-inclusion, or add to `tsconfig.json`:

```json
{ "include": ["./uniwind-types.d.ts"] }
```

If user has some typescript errors related to classNames, just run metro server to build the d.ts file.

### Expo Router Placement

```text
project/
├── app/_layout.tsx    ← import '../global.css' here
├── components/
├── global.css         ← project root (best location)
└── metro.config.js    ← cssEntryFile: './global.css'
```

If `global.css` is in `app/` dir, add `@source` for sibling directories:

```css
@import 'tailwindcss';
@import 'uniwind';
@source '../components';
```

### Tailwind IntelliSense (VS Code / Cursor / Windsurf)

```json
{
  "tailwindCSS.classAttributes": [
    "class", "className", "headerClassName",
    "contentContainerClassName", "columnWrapperClassName",
    "endFillColorClassName", "imageClassName", "tintColorClassName",
    "ios_backgroundColorClassName", "thumbColorClassName",
    "trackColorOnClassName", "trackColorOffClassName",
    "selectionColorClassName", "cursorColorClassName",
    "underlineColorAndroidClassName", "placeholderTextColorClassName",
    "selectionHandleColorClassName", "colorsClassName",
    "progressBackgroundColorClassName", "titleColorClassName",
    "underlayColorClassName", "colorClassName",
    "backdropColorClassName", "backgroundColorClassName",
    "statusBarBackgroundColorClassName", "drawerBackgroundColorClassName",
    "ListFooterComponentClassName", "ListHeaderComponentClassName"
  ],
  "tailwindCSS.classFunctions": ["useResolveClassNames"]
}
```

### Monorepo Support

Add `@source` directives in `global.css` for packages outside the CSS entry file's directory:

```css
@import 'tailwindcss';
@import 'uniwind';
@source "../../packages/ui/src";
@source "../../packages/shared/src";
```

Also needed for `node_modules` packages that contain Uniwind classes (e.g., shared UI libraries).
