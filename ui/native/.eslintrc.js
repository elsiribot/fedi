module.exports = {
    root: true,
    extends: ['@react-native-community', 'prettier', '../.eslintrc.js'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                paths: [
                    {
                        name: '@rneui/themed',
                        importNames: ['Icon'],
                        message: 'Use <SvgImage /> for icons instead',
                    },
                ],
            },
        ],
    },
}
