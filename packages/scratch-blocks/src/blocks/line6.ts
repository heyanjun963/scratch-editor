/**
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @file 六路巡线传感器状态 shadow block。
 */
import * as Blockly from 'blockly/core'
import * as Constants from '../constants'

Blockly.Blocks.line6 = {
  /**
   * 六路巡线传感器状态 shadow block，承载 field_line6 的十六进制位掩码值。
   */
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: '%1',
      args0: [
        {
          type: 'field_line6',
          name: 'LINE6',
        },
      ],
      outputShape: Constants.OUTPUT_SHAPE_ROUND,
      output: 'String',
      extensions: ['colours_sensing'],
    })
  },
}
