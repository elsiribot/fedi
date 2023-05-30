module.exports = {
    root: true,
    extends: ['prettier', '../.eslintrc.js'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    ignorePatterns: ['dist'],
}
