// 从独立产品仓库读取产品源码，生成发布包并更新远程 catalog。
import {execFileSync} from 'child_process';
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const REGISTRY_CONFIG_FILE = 'product-extension-registry.json';
const REGISTRY_TYPE = 'scratch-product-extension-registry';
const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPackScript = path.join(editorRoot, 'packages/scratch-gui/scripts/pack-custom-extension.mjs');
const mindPlusPackScript = path.join(editorRoot, 'packages/scratch-gui/scripts/pack-mindplus-extension.mjs');

const getArgumentValue = flag => {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
};

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJson = (filePath, value) => {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const getLocalizedValue = (value, fallback) => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    return String(value['zh-cn'] || value.zh || value.en || fallback);
};

const parseVersion = version => {
    const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) throw new Error(`产品版本不是语义化版本: ${version || '(empty)'}`);
    return {
        main: match.slice(1, 4).map(Number),
        prerelease: match[4] ? match[4].split('.') : []
    };
};

const compareVersions = (leftVersion, rightVersion) => {
    const left = parseVersion(leftVersion);
    const right = parseVersion(rightVersion);
    for (let index = 0; index < left.main.length; index++) {
        if (left.main[index] !== right.main[index]) return left.main[index] > right.main[index] ? 1 : -1;
    }
    if (!left.prerelease.length && right.prerelease.length) return 1;
    if (left.prerelease.length && !right.prerelease.length) return -1;
    const length = Math.max(left.prerelease.length, right.prerelease.length);
    for (let index = 0; index < length; index++) {
        if (typeof left.prerelease[index] === 'undefined') return -1;
        if (typeof right.prerelease[index] === 'undefined') return 1;
        if (left.prerelease[index] === right.prerelease[index]) continue;
        const leftNumber = Number(left.prerelease[index]);
        const rightNumber = Number(right.prerelease[index]);
        const bothNumeric = Number.isInteger(leftNumber) && Number.isInteger(rightNumber);
        if (bothNumeric) return leftNumber > rightNumber ? 1 : -1;
        return left.prerelease[index].localeCompare(right.prerelease[index]);
    }
    return 0;
};

const getRegistryConfig = targetDirectory => {
    const configPath = path.join(targetDirectory, REGISTRY_CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
        throw new Error(`目标目录缺少 ${REGISTRY_CONFIG_FILE}: ${targetDirectory}`);
    }
    const config = readJson(configPath);
    if (config.formatVersion !== 1 || config.repositoryType !== REGISTRY_TYPE) {
        throw new Error(`目标目录不是受支持的产品配置仓库: ${targetDirectory}`);
    }
    if (!config.provider || !config.repository || !config.packageDownloadBaseUrl || !config.releaseDownloadBaseUrl ||
        typeof config.releaseTag !== 'string' || !config.releaseTag.trim()) {
        throw new Error(
            `${REGISTRY_CONFIG_FILE} 缺少 provider、repository、packageDownloadBaseUrl、releaseDownloadBaseUrl 或 releaseTag`
        );
    }
    return {
        ...config,
        // 一个 releaseTag 对应一次批量发布，包版本仍由各自源配置维护。
        releaseTag: config.releaseTag.trim()
    };
};

const validateProductId = (id, directoryName) => {
    if (!/^[a-z][a-z0-9_-]*$/.test(String(id || ''))) {
        throw new Error(`产品 id 不合法: ${id || '(empty)'}`);
    }
    if (id !== directoryName) {
        throw new Error(`产品目录名必须与 id 一致: ${directoryName} != ${id}`);
    }
};

const readMindPlusSource = (sourceDirectory, directoryName) => {
    const config = readJson(path.join(sourceDirectory, 'config.json'));
    const pythonAsset = config.asset && config.asset.python;
    validateProductId(config.id, directoryName);
    if (!pythonAsset || !pythonAsset.dir || !pythonAsset.main) {
        throw new Error(`Mind+ 产品 ${config.id} 缺少 asset.python.dir/main`);
    }
    const version = String(config.version || pythonAsset.version || '');
    parseVersion(version);
    return {
        id: config.id,
        name: getLocalizedValue(config.name, config.id),
        description: getLocalizedValue(config.description, ''),
        version,
        sourceDirectory,
        packageExtension: 'mpext',
        packScript: mindPlusPackScript
    };
};

const readLegacySource = (sourceDirectory, directoryName) => {
    const manifest = readJson(path.join(sourceDirectory, 'manifest.json'));
    validateProductId(manifest.id, directoryName);
    parseVersion(manifest.version);
    return {
        id: manifest.id,
        name: String(manifest.name || manifest.id),
        description: String(manifest.description || ''),
        version: String(manifest.version),
        sourceDirectory,
        packageExtension: 'sbext',
        packScript: legacyPackScript
    };
};

const getSourcePackages = productRoot => {
    if (!fs.existsSync(productRoot)) throw new Error(`产品仓库缺少 products 目录: ${productRoot}`);
    return fs.readdirSync(productRoot, {withFileTypes: true})
        .filter(entry => entry.isDirectory())
        .map(entry => {
            const sourceDirectory = path.join(productRoot, entry.name);
            if (fs.existsSync(path.join(sourceDirectory, 'config.json'))) {
                return readMindPlusSource(sourceDirectory, entry.name);
            }
            if (fs.existsSync(path.join(sourceDirectory, 'manifest.json'))) {
                return readLegacySource(sourceDirectory, entry.name);
            }
            throw new Error(`产品源目录缺少 config.json 或 manifest.json: ${sourceDirectory}`);
        })
        .sort((left, right) => left.id.localeCompare(right.id));
};

// 同步只读取产品仓库源码，不再从编辑器反向覆盖 products 目录。
const syncPackage = (sourcePackage, targetDirectory, registryConfig, previousEntry) => {
    if (previousEntry && compareVersions(sourcePackage.version, previousEntry.version) < 0) {
        throw new Error(
            `产品 ${sourcePackage.id} 源版本低于 catalog: ${sourcePackage.version} < ${previousEntry.version}`
        );
    }
    const asset = `${sourcePackage.id}-${sourcePackage.version}.${sourcePackage.packageExtension}`;
    const outputFile = path.join(targetDirectory, 'dist', asset);
    // Release tag 代表发布批次，不参与单个产品的版本比较。
    const tag = registryConfig.releaseTag;
    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    execFileSync(process.execPath, [sourcePackage.packScript, sourcePackage.sourceDirectory, outputFile], {
        stdio: 'inherit'
    });

    const sha256 = createHash('sha256').update(fs.readFileSync(outputFile)).digest('hex');
    const sameVersion = previousEntry && previousEntry.version === sourcePackage.version;
    // 同版本只在发布文件和哈希都未变化时继承状态，格式迁移或内容变化必须重新人工验收。
    const sameArtifact = sameVersion && previousEntry.asset === asset && previousEntry.sha256 === sha256;
    return {
        ...(sameVersion ? previousEntry : {}),
        packageId: sourcePackage.id,
        name: sourcePackage.name,
        description: sourcePackage.description,
        version: sourcePackage.version,
        provider: registryConfig.provider,
        repository: registryConfig.repository,
        tag,
        asset,
        downloadUrl: `${registryConfig.packageDownloadBaseUrl.replace(/\/$/, '')}/${asset}`,
        releaseDownloadUrl: `${registryConfig.releaseDownloadBaseUrl.replace(/\/$/, '')}/${tag}/${asset}`,
        sha256,
        status: sameArtifact && previousEntry.status ? previousEntry.status : 'draft'
    };
};

const syncProductExtensions = targetDirectory => {
    const absoluteTarget = path.resolve(targetDirectory);
    if (absoluteTarget === editorRoot) throw new Error('产品配置仓库不能指向 scratch-editor');
    const registryConfig = getRegistryConfig(absoluteTarget);
    const catalogPath = path.join(absoluteTarget, 'catalog.json');
    const currentCatalog = fs.existsSync(catalogPath) ? readJson(catalogPath) : {formatVersion: 1, packages: []};
    if (currentCatalog.formatVersion !== 1 || !Array.isArray(currentCatalog.packages)) {
        throw new Error(`catalog.json 格式不受支持: ${catalogPath}`);
    }

    const entriesById = new Map(currentCatalog.packages.map(entry => [entry.packageId, entry]));
    const sourcePackages = getSourcePackages(path.join(absoluteTarget, 'products'));
    sourcePackages.forEach(sourcePackage => {
        entriesById.set(
            sourcePackage.id,
            syncPackage(sourcePackage, absoluteTarget, registryConfig, entriesById.get(sourcePackage.id))
        );
    });
    writeJson(catalogPath, {
        formatVersion: 1,
        packages: Array.from(entriesById.values()).sort((left, right) => left.packageId.localeCompare(right.packageId))
    });
    console.info(`已从产品仓库源码生成 ${sourcePackages.length} 个发布包`);
};

const targetDirectory = getArgumentValue('--target') ||
    process.env.PRODUCT_EXTENSION_REPOSITORY ||
    path.resolve(editorRoot, '..', 'scratch-product-extensions');

try {
    syncProductExtensions(targetDirectory);
} catch (error) {
    console.error(`产品配置同步失败: ${error.message}`);
    process.exit(1);
}
