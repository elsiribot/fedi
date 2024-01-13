module.exports = {
    root: true,
    extends: [
        // TODO: Remove eslint:recommended and @typescript-eslint/recommended once the root eslint config has these enabled
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'next/core-web-vitals',
        'plugin:react-hooks/recommended',
        '../.eslintrc.js',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
}
