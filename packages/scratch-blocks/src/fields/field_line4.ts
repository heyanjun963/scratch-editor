/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file 四路巡线传感器状态输入字段。
 */
import * as Blockly from 'blockly/core'
import { FieldLine6, type FieldLineConfig } from './field_line6'

/** 四路字段复用巡线位掩码交互，并把有效范围限制为 0x00-0x0f。 */
export class FieldLine4 extends FieldLine6 {
  static readonly DEFAULT_VALUE = '00'

  constructor(value = FieldLine4.DEFAULT_VALUE) {
    super(value, 4, '四路巡线状态')
  }

  /** Blockly 从 line4 shadow block 的 JSON 配置创建字段实例。 */
  static fromJson(options: FieldLineConfig): FieldLine4 {
    return new FieldLine4(options.line4 || FieldLine4.DEFAULT_VALUE)
  }
}

/** 注册 field_line4，供四路巡线 shadow block 使用。 */
export function registerFieldLine4() {
  Blockly.fieldRegistry.register('field_line4', FieldLine4)
}
