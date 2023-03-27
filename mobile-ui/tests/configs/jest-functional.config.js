/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
    preset: 'react-native',
    rootDir: '..',
    testMatch: ['<rootDir>/**/*.test.ts'],
    testPathIgnorePatterns: ['<rootDir>/e2e/*'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
            'babel-jest',
            { configFile: './babel.config.js' },
        ],
    },
}
