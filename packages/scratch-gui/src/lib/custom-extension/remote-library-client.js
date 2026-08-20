const DEFAULT_REMOTE_CATALOG_URL =
    'https://raw.githubusercontent.com/heyanjun963/scratch-product-extensions/main/catalog.json';
const DEFAULT_GITEE_REPOSITORY = 'wdadsd/scratch-product-extensions';
const DEFAULT_REMOTE_CATALOG_SOURCES = Object.freeze([{
    type: 'gitee-contents',
    provider: 'gitee',
    repository: DEFAULT_GITEE_REPOSITORY,
    ref: 'main',
    path: 'catalog.json',
    packagePathPrefix: 'dist'
}, {
    type: 'direct',
    provider: 'github',
    repository: 'heyanjun963/scratch-product-extensions',
    url: DEFAULT_REMOTE_CATALOG_URL
}]);

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_REMOTE_PACKAGE_SIZE = 10 * 1024 * 1024;
const MAX_REMOTE_CATALOG_SIZE = 1024 * 1024;
const GITEE_API_ROOT = 'https://gitee.com/api/v5';
const REMOTE_SOURCE_SELECTION_TTL = 5 * 60 * 1000;
const REMOTE_SOURCE_PROBE_TIMEOUT = 4000;

let remoteSourceSelectionCache = null;

// 外部目录和包直链只允许 HTTPS，避免更新流程降级到明文传输。
const validateHttpsUrl = (value, label) => {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`${label}不合法`);
    }
    if (url.protocol !== 'https:') throw new Error(`${label}必须使用 HTTPS`);
    return url.toString();
};

// Gitee Contents 路径逐段编码，保留斜杠目录结构，避免产品名或分支名破坏 API URL。
const getGiteeContentsUrl = source => {
    const repositoryParts = String(source.repository || '').split('/');
    if (repositoryParts.length !== 2 || repositoryParts.some(part => !part || /\s/.test(part))) {
        throw new Error('Gitee 仓库地址必须为 owner/repository');
    }
    const pathParts = String(source.path || '').split('/');
    if (pathParts.some(part => !part || part === '.' || part === '..')) {
        throw new Error('Gitee Contents 路径不合法');
    }
    const ref = String(source.ref || 'main').trim();
    if (!ref) throw new Error('Gitee Contents 分支不能为空');
    const repository = repositoryParts.map(encodeURIComponent).join('/');
    const contentPath = pathParts.map(encodeURIComponent).join('/');
    return `${GITEE_API_ROOT}/repos/${repository}/contents/${contentPath}?ref=${encodeURIComponent(ref)}`;
};

// 把 catalog 声明或默认配置统一为两种受支持的来源结构。
const normalizeRemoteSource = source => {
    if (!source || typeof source !== 'object') throw new Error('远程拓展来源不合法');
    if (source.type === 'gitee-contents') {
        const normalized = {
            type: source.type,
            provider: String(source.provider || 'gitee'),
            repository: String(source.repository || ''),
            ref: String(source.ref || 'main'),
            path: String(source.path || ''),
            packagePathPrefix: String(source.packagePathPrefix || 'dist')
        };
        getGiteeContentsUrl(normalized);
        return normalized;
    }
    if (source.type === 'direct') {
        return {
            type: source.type,
            provider: String(source.provider || 'direct'),
            repository: String(source.repository || ''),
            url: validateHttpsUrl(source.url, '远程拓展地址')
        };
    }
    throw new Error(`不支持的远程拓展来源类型: ${source.type || '(empty)'}`);
};

// 日志只输出来源类型和公开地址，不包含响应内容或其他运行态数据。
const describeRemoteSource = source => source.type === 'gitee-contents' ?
    `${source.provider}:${source.repository}/${source.path}` :
    `${source.provider}:${source.url}`;

const getRemoteSourceKey = source => JSON.stringify([
    source.type,
    source.provider,
    source.repository,
    source.ref,
    source.path,
    source.url
]);

// 网络探测只使用真实目录请求；超时后释放本次请求，避免慢源阻塞整个拓展库。
const fetchWithTimeout = (fetchImpl, url, requestOptions, timeoutMs) => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timer;
    const options = controller ? {...requestOptions, signal: controller.signal} : requestOptions;
    const request = Promise.resolve().then(() => fetchImpl(url, options));
    const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => {
            if (controller) controller.abort();
            reject(new Error(`远程拓展来源请求超过 ${timeoutMs}ms`));
        }, timeoutMs);
    });
    return Promise.race([request, timeout]).finally(() => clearTimeout(timer));
};

// Contents 的 Base64 文本按原始字节解码，SBEXT 不经过字符串编码转换。
const decodeBase64 = content => {
    let binary;
    try {
        binary = globalThis.atob(String(content || '').replace(/\s/g, ''));
    } catch {
        throw new Error('Gitee Contents Base64 内容不合法');
    }
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) data[index] = binary.charCodeAt(index);
    return data.buffer;
};

// Gitee API 返回 JSON 包装的 Base64 文件，解码后再交给 catalog 或 SBEXT 的既有校验层。
const loadGiteeContentsData = async (source, fetchImpl, maxDecodedSize) => {
    const url = getGiteeContentsUrl(source);
    const response = await fetchImpl(url, {cache: 'no-store'});
    if (!response.ok) throw new Error(`Gitee Contents 请求失败: HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || payload.type !== 'file' || payload.encoding !== 'base64' || typeof payload.content !== 'string') {
        throw new Error('Gitee Contents 响应格式不受支持');
    }
    const reportedSize = Number(payload.size);
    const maxEncodedSize = Math.ceil(maxDecodedSize / 3) * 4 + 4096;
    if (!Number.isSafeInteger(reportedSize) || reportedSize < 0) {
        throw new Error('Gitee Contents 文件大小不合法');
    }
    if (reportedSize > maxDecodedSize || payload.content.length > maxEncodedSize) {
        throw new Error(`远程文件大小超过 ${maxDecodedSize / 1024 / 1024} MiB 限制`);
    }
    const data = decodeBase64(payload.content);
    if (data.byteLength > maxDecodedSize) {
        throw new Error(`远程文件大小超过 ${maxDecodedSize / 1024 / 1024} MiB 限制`);
    }
    return {data, url};
};

// GitHub Raw 等二进制直链沿用下载前后两次体积检查。
const loadDirectPackageData = async (source, fetchImpl) => {
    const response = await fetchImpl(source.url, {cache: 'no-store'});
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
    return {data, url: source.url};
};

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

// 兼容旧 downloadUrl，并把新 catalog 中的结构化来源归一化为有序列表。
const getRemotePackageSources = remotePackage => {
    const sources = Array.isArray(remotePackage.sources) ? remotePackage.sources.slice() : [];
    if (remotePackage.downloadUrl && !sources.some(source => source.type === 'direct' &&
        source.url === remotePackage.downloadUrl)) {
        sources.push({
            type: 'direct',
            provider: remotePackage.provider || 'direct',
            repository: remotePackage.repository || '',
            url: remotePackage.downloadUrl
        });
    }
    return sources.map(normalizeRemoteSource);
};

// catalog 属于外部输入，在下载前统一校验产品标识、版本、文件名、来源和哈希。
const validateRemotePackage = remotePackage => {
    const packageId = String(remotePackage && remotePackage.packageId || '');
    if (!/^[a-z][a-z0-9_-]*$/.test(packageId)) {
        throw new Error(`远程产品 packageId 不合法: ${packageId || '(empty)'}`);
    }
    parseVersion(remotePackage.version);
    if (!/^[0-9A-Za-z][0-9A-Za-z._-]*\.(?:sbext|mpext)$/i.test(String(remotePackage.asset || ''))) {
        throw new Error(`远程产品缺少或存在不合法的拓展包 asset: ${packageId}`);
    }
    const sources = getRemotePackageSources(remotePackage);
    if (!sources.length) throw new Error(`远程产品缺少下载来源: ${packageId}`);
    if (!SHA256_PATTERN.test(String(remotePackage.sha256 || ''))) {
        throw new Error(`远程产品 SHA256 不合法: ${packageId}`);
    }
    return {
        ...remotePackage,
        packageId,
        version: String(remotePackage.version),
        sha256: String(remotePackage.sha256).toLowerCase(),
        sources
    };
};

// 按测速后的来源顺序补齐包下载地址，保留失败回退和 SHA256 校验链路。
const addCatalogSourcesToPackage = (remotePackage, catalogSources) => {
    const preferredSource = catalogSources[0];
    const directPackageSource = preferredSource && preferredSource.type === 'direct' && remotePackage.downloadUrl ? [{
        type: 'direct',
        provider: remotePackage.provider || preferredSource.provider,
        repository: remotePackage.repository || preferredSource.repository,
        url: remotePackage.downloadUrl
    }] : [];
    const giteeSources = catalogSources
        .filter(catalogSource => catalogSource.type === 'gitee-contents')
        .map(catalogSource => {
            const pathPrefix = catalogSource.packagePathPrefix.replace(/^\/+|\/+$/g, '');
            return {
                type: catalogSource.type,
                provider: catalogSource.provider,
                repository: catalogSource.repository,
                ref: catalogSource.ref,
                path: `${pathPrefix}/${remotePackage.asset}`
            };
        });
    return {
        ...remotePackage,
        sources: [...directPackageSource, ...giteeSources, ...(Array.isArray(remotePackage.sources) ? remotePackage.sources : [])]
    };
};

// 不同来源最终都转换为普通 catalog 对象，后续发布状态和字段校验保持一致。
const loadCatalogFromSource = async (source, fetchImpl) => {
    if (source.type === 'gitee-contents') {
        const {data} = await loadGiteeContentsData(source, fetchImpl, MAX_REMOTE_CATALOG_SIZE);
        try {
            return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(data));
        } catch {
            throw new Error('Gitee 远程拓展目录 JSON 不合法');
        }
    }
    const response = await fetchImpl(source.url, {cache: 'no-store'});
    if (!response.ok) throw new Error(`远程拓展目录请求失败: HTTP ${response.status}`);
    return response.json();
};

const selectRemoteCatalogSources = async (catalogSources, fetchImpl, options = {}) => {
    const normalizedSources = catalogSources.map(normalizeRemoteSource);
    const cacheKey = normalizedSources.map(getRemoteSourceKey).join('|');
    const now = Date.now();
    if (remoteSourceSelectionCache && remoteSourceSelectionCache.cacheKey === cacheKey &&
        remoteSourceSelectionCache.expiresAt > now) {
        const sourceByKey = new Map(normalizedSources.map(source => [getRemoteSourceKey(source), source]));
        const cachedSources = remoteSourceSelectionCache.sourceKeys
            .map(key => sourceByKey.get(key))
            .filter(Boolean);
        return {sources: cachedSources};
    }

    const timeoutMs = Number.isFinite(options.sourceProbeTimeoutMs) ?
        Math.max(1, options.sourceProbeTimeoutMs) : REMOTE_SOURCE_PROBE_TIMEOUT;
    const probes = normalizedSources.map(source => loadCatalogFromSource(
        source,
        (url, requestOptions) => fetchWithTimeout(fetchImpl, url, requestOptions, timeoutMs)
    ).then(catalog => ({source, catalog})));
    let winner;
    try {
        winner = await Promise.any(probes);
    } catch {
        return {sources: normalizedSources};
    }
    const winnerKey = getRemoteSourceKey(winner.source);
    const orderedSources = [winner.source, ...normalizedSources.filter(source =>
        getRemoteSourceKey(source) !== winnerKey)];
    remoteSourceSelectionCache = {
        cacheKey,
        expiresAt: now + (Number.isFinite(options.sourceSelectionTtlMs) ?
            Math.max(1, options.sourceSelectionTtlMs) : REMOTE_SOURCE_SELECTION_TTL),
        sourceKeys: orderedSources.map(getRemoteSourceKey)
    };
    return {sources: orderedSources, catalog: winner.catalog};
};

// 只接收 published 条目；draft 包不会进入普通用户的版本检查结果。
const loadRemoteLibraryCatalog = async (options = {}) => {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持网络请求');
    const hasExplicitSources = Boolean(options.catalogSources || options.catalogUrl);
    const configuredSources = options.catalogSources || (options.catalogUrl ? [{
        type: 'direct',
        provider: 'direct',
        url: options.catalogUrl
    }] : DEFAULT_REMOTE_CATALOG_SOURCES);
    const autoSelectSource = options.autoSelectSource !== false && !hasExplicitSources;
    const selection = autoSelectSource ? await selectRemoteCatalogSources(
        configuredSources,
        fetchImpl,
        options
    ) : {sources: configuredSources};
    const catalogSources = selection.sources;
    const failures = [];
    for (let index = 0; index < catalogSources.length; index++) {
        const source = normalizeRemoteSource(catalogSources[index]);
        try {
            const catalog = index === 0 && selection.catalog ? selection.catalog :
                await loadCatalogFromSource(source, fetchImpl);
            if (!catalog || catalog.formatVersion !== 1 || !Array.isArray(catalog.packages)) {
                throw new Error('远程拓展目录格式不受支持');
            }
            return catalog.packages
                .filter(remotePackage => remotePackage.status === 'published')
                .map(remotePackage => validateRemotePackage(addCatalogSourcesToPackage(remotePackage, catalogSources)));
        } catch (error) {
            failures.push(`${describeRemoteSource(source)}: ${error.message}`);
            if (index < catalogSources.length - 1) {
                console.warn(`[remote-library-client] loadRemoteLibraryCatalog 来源失败，尝试备用源: ${
                    describeRemoteSource(source)}`, error);
            }
        }
    }
    throw new Error(`远程拓展目录所有来源均失败: ${failures.join('; ')}`);
};

const clearRemoteSourceSelectionCache = () => {
    remoteSourceSelectionCache = null;
};

const calculateSha256 = async data => {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || !cryptoApi.subtle) throw new Error('当前环境不支持 SHA256 校验');
    const digest = await cryptoApi.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};

// 远程包只有在字节哈希匹配 catalog 后才交给 package-reader 解析。
const downloadRemoteLibraryPackage = async (remotePackage, {
    fetchImpl = globalThis.fetch,
    sha256Impl = calculateSha256
} = {}) => {
    const normalizedPackage = validateRemotePackage(remotePackage);
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持网络请求');
    const failures = [];
    for (let index = 0; index < normalizedPackage.sources.length; index++) {
        const source = normalizedPackage.sources[index];
        try {
            const {data, url} = source.type === 'gitee-contents' ?
                await loadGiteeContentsData(source, fetchImpl, MAX_REMOTE_PACKAGE_SIZE) :
                await loadDirectPackageData(source, fetchImpl);
            const actualSha256 = await sha256Impl(data);
            if (actualSha256.toLowerCase() !== normalizedPackage.sha256) {
                throw new Error(`拓展包 SHA256 校验失败: ${normalizedPackage.packageId}`);
            }
            return {
                data,
                remotePackage: {
                    ...normalizedPackage,
                    provider: source.provider,
                    repository: source.repository,
                    resolvedDownloadUrl: url,
                    resolvedSourceType: source.type
                }
            };
        } catch (error) {
            failures.push(`${describeRemoteSource(source)}: ${error.message}`);
            if (index < normalizedPackage.sources.length - 1) {
                console.warn(`[remote-library-client] downloadRemoteLibraryPackage 来源失败，尝试备用源: ${
                    describeRemoteSource(source)}`, error);
            }
        }
    }
    throw new Error(`拓展包所有下载来源均失败: ${normalizedPackage.packageId}; ${failures.join('; ')}`);
};

export {
    DEFAULT_REMOTE_CATALOG_URL,
    DEFAULT_REMOTE_CATALOG_SOURCES,
    MAX_REMOTE_PACKAGE_SIZE,
    clearRemoteSourceSelectionCache,
    compareVersions,
    downloadRemoteLibraryPackage,
    loadRemoteLibraryCatalog
};
