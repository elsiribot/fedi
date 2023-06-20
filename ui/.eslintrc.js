module.exports = {
    rules: {
        'curly': 'off',
        'no-shadow': 'off',
        'no-undef': 'off',
        'semi': 'off',
        'react/react-in-jsx-scope': 'off',
        'react-native/no-inline-styles': 'off',
        'no-console': ['error', { allow: ['debug', 'info', 'warn', 'error'] }],
        '@typescript-eslint/no-unused-vars': [
            'error',
            { argsIgnorePattern: '^_' },
        ],
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
