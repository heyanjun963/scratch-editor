const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;

const isValidFontSize = fontSize => (
    Number.isInteger(fontSize) &&
    fontSize >= MIN_FONT_SIZE &&
    fontSize <= MAX_FONT_SIZE
);

export {
    DEFAULT_FONT_SIZE,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE,
    isValidFontSize
};
