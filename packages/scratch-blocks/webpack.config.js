const path = require('path');

// scratch-gui 运行时读取 scratch-blocks 的 dist/main.mjs，这里把 TypeScript 源码打成该入口文件。
module.exports = {
    entry: './src/index.ts',
    experiments: {
        outputModule: true
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.build.json',
                        transpileOnly: true
                    }
                }
            }
        ]
    },
    output: {
        clean: false,
        filename: 'main.mjs',
        library: {
            type: 'module'
        },
        module: true,
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json']
    }
};
