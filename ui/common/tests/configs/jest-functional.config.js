/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    rootDir: '..',
    preset: 'ts-jest',
    testEnvironment: './environment.js',
    testMatch: ['<rootDir>/**/*.test.ts'],
    testPathIgnorePatterns: ['<rootDir>/detox/*'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
