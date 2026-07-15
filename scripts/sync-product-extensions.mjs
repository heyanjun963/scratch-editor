import {execFileSync} from 'child_process';
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const REGISTRY_CONFIG_FILE = 'product-extension-registry.json';
const REGISTRY_TYPE = 'scratch-product-extension-registry';
const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(
    editorRoot,
    'packages/scratch-gui/src/lib/custom-extension/builtin-product-packages'
);
const packScript = path.join(editorRoot, 'packages/scratch-gui/scripts/pack-custom-extension.mjs');

const getArgumentValue = flag => {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
};

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJson = (filePath, value) => {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
    if (!config.provider || !config.repository || !config.packageDownloadBaseUrl || !config.releaseDownloadBaseUrl) {
        throw new Error(
            `${REGISTRY_CONFIG_FILE} 缺少 provider、repository、packageDownloadBaseUrl 或 releaseDownloadBaseUrl`
        );
    }
    return config;
};

const getSourcePackages = () => fs.readdirSync(sourceRoot, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => {
        const sourceDirectory = path.join(sourceRoot, entry.name);
        const manifestPath = path.join(sourceDirectory, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`产品源目录缺少 manifest.json: ${sourceDirectory}`);
        }
        const manifest = readJson(manifestPath);
        if (!/^[a-z][a-z0-9_-]*$/.test(String(manifest.id || ''))) {
            throw new Error(`产品 manifest.id 不合法: ${manifest.id || '(empty)'}`);
        }
        if (manifest.id !== entry.name) {
            throw new Error(`产品目录名必须与 manifest.id 一致: ${entry.name} != ${manifest.id}`);
        }
        if (!manifest.version) {
            throw new Error(`产品 manifest.version 不能为空: ${manifest.id}`);
        }
        return {manifest, sourceDirectory};
    })
    .sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));

// 同步单个产品的声明式源文件，并生成带版本号且可直接发布的稳定 SBEXT 包。
const syncPackage = ({manifest, sourceDirectory}, targetDirectory, registryConfig, previousEntry) => {
    const productDirectory = path.join(targetDirectory, 'products', manifest.id);
    const asset = `${manifest.id}-${manifest.version}.sbext`;
    const outputFile = path.join(targetDirectory, 'dist', asset);
    const tag = `${manifest.id}-v${manifest.version}`;

    fs.rmSync(productDirectory, {recursive: true, force: true});
    fs.mkdirSync(path.dirname(productDirectory), {recursive: true});
    fs.cpSync(sourceDirectory, productDirectory, {recursive: true});
    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    execFileSync(process.execPath, [packScript, sourceDirectory, outputFile], {stdio: 'inherit'});

    const sha256 = createHash('sha256').update(fs.readFileSync(outputFile)).digest('hex');
    const sameVersion = previousEntry && previousEntry.version === manifest.version;
    return {
        ...(sameVersion ? previousEntry : {}),
        packageId: manifest.id,
        name: manifest.name,
        description: manifest.description || '',
        version: manifest.version,
        provider: registryConfig.provider,
        repository: registryConfig.repository,
        tag,
        asset,
        // Raw 文件支持浏览器 CORS；Release 下载地址保留给用户手动下载和版本追溯。
        downloadUrl: `${registryConfig.packageDownloadBaseUrl.replace(/\/$/, '')}/${asset}`,
        releaseDownloadUrl: `${registryConfig.releaseDownloadBaseUrl.replace(/\/$/, '')}/${tag}/${asset}`,
        sha256,
        status: sameVersion && previousEntry.status ? previousEntry.status : 'draft'
    };
};

// catalog 只更新本次从编辑器同步的产品，保留总仓库中独立维护的其他产品配置。
const syncProductExtensions = targetDirectory => {
    const absoluteTarget = path.resolve(targetDirectory);
    if (absoluteTarget === editorRoot || absoluteTarget === sourceRoot) {
        throw new Error('产品配置仓库不能指向 scratch-editor 或产品源目录');
    }
    const registryConfig = getRegistryConfig(absoluteTarget);
    const catalogPath = path.join(absoluteTarget, 'catalog.json');
    const currentCatalog = fs.existsSync(catalogPath) ? readJson(catalogPath) : {formatVersion: 1, packages: []};
    if (currentCatalog.formatVersion !== 1 || !Array.isArray(currentCatalog.packages)) {
        throw new Error(`catalog.json 格式不受支持: ${catalogPath}`);
    }

    const entriesById = new Map(currentCatalog.packages.map(entry => [entry.packageId, entry]));
    const sourcePackages = getSourcePackages();
    sourcePackages.forEach(sourcePackage => {
        const packageId = sourcePackage.manifest.id;
        entriesById.set(
            packageId,
            syncPackage(sourcePackage, absoluteTarget, registryConfig, entriesById.get(packageId))
        );
    });

    const catalog = {
        formatVersion: 1,
        packages: Array.from(entriesById.values())
            .sort((left, right) => left.packageId.localeCompare(right.packageId))
    };
    writeJson(catalogPath, catalog);
    console.info(`已同步 ${sourcePackages.length} 个产品到 ${absoluteTarget}`);
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
