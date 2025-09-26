# @constructor-v3/config

Configuration partagée (ESLint, Prettier, Tailwind) pour le monorepo.

## Usage

ESLint (flat):
```js
// eslint.config.js
import shared from '@constructor-v3/config/eslint';
export default [...shared];
```

Prettier:
```cjs
module.exports = require('@constructor-v3/config/prettier');
```

Tailwind:
```js
import base from '@constructor-v3/config/tailwind';
export default { ...base };
```
