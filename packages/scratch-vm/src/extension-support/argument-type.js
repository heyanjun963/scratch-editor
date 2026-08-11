/**
 * Block argument types
 * @enum {string}
 */
const ArgumentType = {
    /**
     * Numeric value with angle picker
     */
    ANGLE: 'angle',

    /**
     * Boolean value with hexagonal placeholder
     */
    BOOLEAN: 'Boolean',

    /**
     * Numeric value with color picker
     */
    COLOR: 'color',

    /**
     * Numeric value with text field
     */
    NUMBER: 'number',

    /**
     * String value with text field
     */
    STRING: 'string',

    /**
     * String value with matrix field
     */
    MATRIX: 'matrix',

    /**
     * 16×8 点阵屏编辑器，字段值为 128 位二进制字符串。
     */
    LEDMATRIX: 'led_matrix',

    /**
     * 四路巡线传感器状态选择器，字段值使用两位十六进制位掩码。
     */
    LINE4: 'line4',

    /**
     * 六路巡线传感器状态选择器，字段值使用两位十六进制位掩码。
     */
    LINE6: 'line6',

    /**
     * MIDI note number with note picker (piano) field
     */
    NOTE: 'note',

    /**
     * Inline image on block (as part of the label)
     */
    IMAGE: 'image'
};

module.exports = ArgumentType;
