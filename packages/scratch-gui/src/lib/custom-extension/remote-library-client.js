const DEFAULT_REMOTE_CATALOG_URL =
    'https://raw.githubusercontent.com/heyanjun963/scratch-product-extensions/main/catalog.json';

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_REMOTE_PACKAGE_SIZE = 10 * 1024 * 1024;

// 产品包版本使用严格语义化版本，避免远程 tag 中的普通字符串产生错误升级判断。
const parseVersion = version => {
    const match = VERSION_PATTERN.exec(String(version || '').trim());
    if (!match) throw new Error(`不支持的产品拓展版本: ${version}`);
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] ? match[4].split('.') : []
    };
};

const comparePrerelease = (left, right) => {
    if (!left.length && !right.length) return 0;
    if (!left.length) return 1;
    if (!right.length) return -1;
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index++) {
        if (typeof left[index] === 'undefined') return -1;
        if (typeof right[index] === 'undefined') return 1;
        const leftNumber = /^\d+$/.test(left[index]) ? Number(left[index]) : null;
        const rightNumber = /^\d+$/.test(right[index]) ? Number(right[index]) : null;
        if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
            return leftNumber > rightNumber ? 1 : -1;
        }
        if (leftNumber !== null && rightNumber === null) return -1;
        if (leftNumber === null && rightNumber !== null) return 1;
        if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
    }
    return 0;
};

const compareVersions = (leftVersion, rightVersion) => {
    const left = parseVersion(leftVersion);
    const right = parseVersion(rightVersion);
    for (const key of ['major', 'minor', 'patch']) {
        if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
    }
    return comparePrerelease(left.prerelease, right.prerelease);
};

const validateRemotePackage = remotePackage => {
    const packageId = String(remotePackage && remotePackage.packageId || '');
    if (!/^[a-z][a-z0-9_-]*$/.test(packageId)) {
        throw new Error(`远程产品 packageId 不合法: ${packageId || '(empty)'}`);
    }
    parseVersion(remotePackage.version);
    if (!remotePackage.asset || !/\.sbext$/i.test(remotePackage.asset)) {
        throw new Error(`远程产品缺少 SBEXT asset: ${packageId}`);
    }
    let downloadUrl;
    try {
        downloadUrl = new URL(remotePackage.downloadUrl);
    } catch {
        throw new Error(`远程产品下载地址不合法: ${packageId}`);
    }
    if (downloadUrl.protocol !== 'https:') {
        throw new Error(`远程产品下载地址必须使用 HTTPS: ${packageId}`);
    }
    if (!SHA256_PATTERN.test(String(remotePackage.sha256 || ''))) {
        throw new Error(`远程产品 SHA256 不合法: ${packageId}`);
    }
    return {
        ...remotePackage,
        packageId,
        version: String(remotePackage.version),
        sha256: String(remotePackage.sha256).toLowerCase()
    };
};

// 只接收 published 条目；draft 包不会进入普通用户的版本检查结果。
const loadRemoteLibraryCatalog = async ({
    catalogUrl = DEFAULT_REMOTE_CATALOG_URL,
    fetchImpl = globalThis.fetch
} = {}) => {
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持网络请求');
    const response = await fetchImpl(catalogUrl, {cache: 'no-store'});
    if (!response.ok) throw new Error(`远程拓展目录请求失败: HTTP ${response.status}`);
    const catalog = await response.json();
    if (!catalog || catalog.formatVersion !== 1 || !Array.isArray(catalog.packages)) {
        throw new Error('远程拓展目录格式不受支持');
    }
    return catalog.packages
        .filter(remotePackage => remotePackage.status === 'published')
        .map(validateRemotePackage);
};

const calculateSha256 = async data => {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || !cryptoApi.subtle) throw new Error('当前环境不支持 SHA256 校验');
    const digest = await cryptoApi.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};

// Release 资产只有在字节哈希匹配 catalog 后才交给 package-reader 解析。
const downloadRemoteLibraryPackage = async (remotePackage, {
    fetchImpl = globalThis.fetch,
    sha256Impl = calculateSha256
} = {}) => {
    const normalizedPackage = validateRemotePackage(remotePackage);
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持网络请求');
    const response = await fetchImpl(normalizedPackage.downloadUrl, {cache: 'no-store'});
    if (!response.ok) throw new Error(`拓展包下载失败: HTTP ${response.status}`);
    const contentLength = response.headers && response.headers.get ?
        Number(response.headers.get('content-length')) :
        0;
    if (contentLength > MAX_REMOTE_PACKAGE_SIZE) {
        throw new Error(`拓展包大小超过 ${MAX_REMOTE_PACKAGE_SIZE / 1024 / 1024} MiB 限制`);
    }
    const data = await response.arrayBuffer();
    if (data.byteLength > MAX_REMOTE_PACKAGE_SIZE) {
        throw new Error(`拓展包大小超过 ${MAX_REMOTE_PACKAGE_SIZE / 1024 / 1024} MiB 限制`);
    }
    const actualSha256 = await sha256Impl(data);
    if (actualSha256.toLowerCase() !== normalizedPackage.sha256) {
        throw new Error(`拓展包 SHA256 校验失败: ${normalizedPackage.packageId}`);
    }
    return {
        data,
        remotePackage: normalizedPackage
    };
};

export {
    DEFAULT_REMOTE_CATALOG_URL,
    MAX_REMOTE_PACKAGE_SIZE,
    compareVersions,
    downloadRemoteLibraryPackage,
    loadRemoteLibraryCatalog
};
