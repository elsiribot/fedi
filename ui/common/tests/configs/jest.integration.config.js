/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    rootDir: '..',
    preset: 'ts-jest',
    testEnvironment: './environment.ts',
    testMatch: ['**/tests/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/test-utils/setup.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
