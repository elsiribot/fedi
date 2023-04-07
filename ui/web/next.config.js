/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@fedi/common'],
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: [
                {
                    loader: '@svgr/webpack',
                    options: {
                        dimensions: false,
                    },
                },
            ],
        })

        return config
    },
}

module.exports = nextConfig
