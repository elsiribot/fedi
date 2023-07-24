module.exports = {
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'next/core-web-vitals',
        'plugin:react-hooks/recommended',
        'prettier',
        '../.eslintrc.js',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
}
