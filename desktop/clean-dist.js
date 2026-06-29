const fs = require('fs');
const path = require('path');

const desktopDist = path.resolve(__dirname, '..', 'desktop-dist');
const workspaceRoot = path.resolve(__dirname, '..');

if (!desktopDist.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`Refusing to clean outside workspace: ${desktopDist}`);
}

fs.rmSync(desktopDist, {
    force: true,
    recursive: true
});
