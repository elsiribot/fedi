/** @type {import('knip').KnipConfig} */
const config = {
    ignoreDependencies: ['@fedi/common/*'],
    ignoreExportsUsedInFile: true,
    ignore: ['./web/.next'],
    ignoreMembers: ['SupportedCurrency'],
    rules: {
        enumMembers: 'off',
        classMembers: 'off',
    }
};

export default config;