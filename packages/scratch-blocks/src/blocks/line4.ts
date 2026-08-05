/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file 四路巡线传感器状态 shadow block。
 */
import * as Blockly from 'blockly/core'
import * as Constants from '../constants'
import { FieldLine4 } from '../fields/field_line4'

Blockly.Blocks.line4 = {
  /** 四路状态 shadow block 承载 field_line4 的十六进制位掩码值。 */
  init: function (this: Blockly.Block) {
    // 直接创建字段，避免产品积木先加载时因字段注册时序导致 shadow block 内容为空。
    this.appendDummyInput().appendField(new FieldLine4(), 'LINE4')
    this.setOutput(true, 'String')
    this.setOutputShape(Constants.OUTPUT_SHAPE_ROUND)
    Blockly.Extensions.apply('colours_sensing', this, false)
  },
}
