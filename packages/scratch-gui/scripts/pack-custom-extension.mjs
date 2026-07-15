import fs from 'fs';
import path from 'path';

import JSZip from 'jszip';

const PACKAGE_FILE_DATE = new Date(Date.UTC(1980, 0, 1));

// 通用 .sbext 打包器：保持源包相对路径不变，确保产物能被 package-reader 重新导入。
const collectFiles = directory => fs.readdirSync(directory, {withFileTypes: true})
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        return entry.isDirectory() ? collectFiles(absolutePath) : [absolutePath];
    });

const packCustomExtension = async (sourceDirectory, outputFile) => {
    const absoluteSource = path.resolve(sourceDirectory);
    const absoluteOutput = path.resolve(outputFile);
    const requiredFiles = ['manifest.json', 'blocks.json', path.join('generator', 'python.json')];

    requiredFiles.forEach(relativePath => {
        if (!fs.existsSync(path.join(absoluteSource, relativePath))) {
            throw new Error(`拓展源包缺少必需文件: ${relativePath}`);
        }
    });

    const zip = new JSZip();
    collectFiles(absoluteSource).forEach(absolutePath => {
        const relativePath = path.relative(absoluteSource, absolutePath).split(path.sep).join('/');
        // 只写入固定时间的文件条目，避免 JSZip 自动目录使用当前时间导致 SHA256 漂移。
        zip.file(relativePath, fs.readFileSync(absolutePath), {
            createFolders: false,
            date: PACKAGE_FILE_DATE
        });
    });

    const content = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {level: 9}
    });
    fs.mkdirSync(path.dirname(absoluteOutput), {recursive: true});
    fs.writeFileSync(absoluteOutput, content);
    console.info(`已生成 ${path.relative(process.cwd(), absoluteOutput)} (${content.length} bytes)`);
};

const [sourceDirectory, outputFile] = process.argv.slice(2);
if (!sourceDirectory || !outputFile) {
    console.error('用法: node scripts/pack-custom-extension.mjs <源包目录> <输出.sbext>');
    process.exit(1);
}

packCustomExtension(sourceDirectory, outputFile).catch(error => {
    console.error(error);
    process.exit(1);
});
