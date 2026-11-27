// @ts-check
// 모노레포 하나의 설정 — 각 앱의 `npm run lint`(eslint src)가 이 파일을 찾아 쓴다. 서식은 Prettier가 맡는다
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      'docs/**',
      // 측정 하네스(.cjs)는 실행 기록용 스크립트라 대상에서 뺀다
      'apps/backend/scripts/**',
      'apps/backend/.measure/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // _로 시작하는 이름은 일부러 안 쓰는 값 (for await (const _ of picks) · (_text, options) 등)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['apps/frontend/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  prettier,
);
