module.exports = {
    root: true,
    extends: '@react-native-community',
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        'curly': 'off',
        'no-shadow': 'off',
        'no-undef': 'off',
        'semi': 'off',
        'react/react-in-jsx-scope': 'off',
        'react-native/no-inline-styles': 'off',
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/no-shadow': ['error'],
            },
        },
    ],
}
