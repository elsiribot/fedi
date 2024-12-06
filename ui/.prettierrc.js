/** @type {import('prettier').Config} */
module.exports = {
    arrowParens: 'avoid',
    bracketSameLine: true,
    bracketSpacing: true,
    quoteProps: 'consistent',
    singleQuote: true,
    semi: false,
    tabWidth: 4,
    trailingComma: 'all',
    importOrder: ['<THIRD_PARTY_MODULES>', '^@fedi/(.*)$', '^[./]'],
    importOrderSeparation: true,
    plugins: ['prettier-plugin-organize-imports'],
}
