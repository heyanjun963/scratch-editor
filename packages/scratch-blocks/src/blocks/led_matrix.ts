/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file 16×8 点阵屏 shadow block。
 */
import * as Blockly from 'blockly/core'
import * as Constants from '../constants'
import { FieldLedMatrix } from '../fields/field_led_matrix'

Blockly.Blocks.led_matrix = {
  /** 点阵屏 shadow block 直接创建专用字段，确保动态拓展注册时内容可见。 */
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new FieldLedMatrix(), 'LEDMATRIX')
    this.setOutput(true, 'String')
    this.setOutputShape(Constants.OUTPUT_SHAPE_ROUND)
    Blockly.Extensions.apply('colours_pen', this, false)
  },
}
