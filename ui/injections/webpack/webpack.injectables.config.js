const path = require('path')

const src = path.join(__dirname, '../src')
const dist = path.join(__dirname, '../dist')

module.exports = env => ({
    mode: env.prod ? 'production' : 'development',
    devtool: false,
    entry: {
        'injectables/eruda': path.join(src, 'injectables/eruda.ts'),
        'injectables/webln': path.join(src, 'injectables/webln.ts'),
    },
    output: {
        path: dist,
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
})
