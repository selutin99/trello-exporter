import sonarjs from 'eslint-plugin-sonarjs';
import base from './eslint.config.mjs';

export default [...base, { ...sonarjs.configs.recommended, files: ['src/**/*.ts', '*.config.ts'] }];
