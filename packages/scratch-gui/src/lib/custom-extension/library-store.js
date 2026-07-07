const customExtensionIconSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">',
    '<rect width="80" height="80" rx="16" fill="#4C97FF"/>',
    '<path d="M18 24h44v10H18zM18 38h30v10H18zM18 52h38v10H18z" fill="#fff"/>',
    '<path d="M56 38v-8h8v8h8v8h-8v8h-8v-8h-8v-8z" fill="#FFD43B"/>',
    '</svg>'
].join('');

const importIconSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">',
    '<rect width="80" height="80" rx="16" fill="#0FBD8C"/>',
    '<path d="M40 16v36M26 38l14 14 14-14" stroke="#fff" stroke-width="7" stroke-linecap="round" ',
    'stroke-linejoin="round" fill="none"/>',
    '<path d="M22 60h36" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
    '</svg>'
].join('');

const exportIconSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">',
    '<rect width="80" height="80" rx="16" fill="#FFAB19"/>',
    '<path d="M40 56V20M26 34l14-14 14 14" stroke="#fff" stroke-width="7" stroke-linecap="round" ',
    'stroke-linejoin="round" fill="none"/>',
    '<path d="M22 60h36" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
    '</svg>'
].join('');

const deleteIconSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">',
    '<rect width="80" height="80" rx="16" fill="#FF6680"/>',
    '<path d="M25 28h30M33 28V20h14v8M31 36v20M40 36v20M49 36v20" stroke="#fff" ',
    'stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    '</svg>'
].join('');

const svgToDataURI = svg => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const customExtensionIconURL = svgToDataURI(customExtensionIconSvg);
const deleteIconURL = svgToDataURI(deleteIconSvg);
const importIconURL = svgToDataURI(importIconSvg);
const exportIconURL = svgToDataURI(exportIconSvg);

// 拓展库卡片优先使用 manifest 自带图标，没有则使用统一的本地库默认图标。
const getManifestIconURL = manifest => manifest.icon || customExtensionIconURL;

export {
    customExtensionIconURL,
    deleteIconURL,
    exportIconURL,
    getManifestIconURL,
    importIconURL
};
