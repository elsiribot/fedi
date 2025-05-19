module.exports = {
    preset: 'react-native',
    rootDir: '..',
    testMatch: [
        '<rootDir>/native/tests/**/*.test.ts',
        '<rootDir>/native/tests/**/*.test.tsx',
    ],
    testPathIgnorePatterns: ['<rootDir>/detox/*'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transformIgnorePatterns: ['node_modules/(?!uuid)'],
    passWithNoTests: true,
}
