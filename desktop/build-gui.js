const {spawnSync} = require('child_process');
const path = require('path');

const guiDir = path.join(__dirname, '..', 'packages', 'scratch-gui');
const webpackBin = path.join(__dirname, '..', 'node_modules', 'webpack', 'bin', 'webpack.js');

const result = spawnSync(process.execPath, [webpackBin], {
    cwd: guiDir,
    env: {
        ...process.env,
        BUILD_TYPE: 'dev',
        NODE_ENV: 'production'
    },
    stdio: 'inherit'
});

if (result.error) {
    throw result.error;
}

if (result.signal) {
    throw new Error(`scratch-gui build was terminated by ${result.signal}`);
}

process.exit(result.status);
