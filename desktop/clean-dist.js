const fs = require('fs');
const path = require('path');

const desktopDist = path.resolve(__dirname, '..', 'desktop-dist');
const workspaceRoot = path.resolve(__dirname, '..');

// 清理前确认目标仍在仓库内，避免路径计算异常时误删工作区外文件。
if (!desktopDist.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`Refusing to clean outside workspace: ${desktopDist}`);
}

fs.rmSync(desktopDist, {
    force: true,
    recursive: true
});
