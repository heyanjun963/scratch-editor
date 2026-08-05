/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, test } from 'vitest'
import * as Blockly from 'blockly/core'
import '../../src/blocks/vertical_extensions'
import '../../src/blocks/line4'
import { FieldLine4 } from '../../src/fields/field_line4'
import { FieldLine6 } from '../../src/fields/field_line6'

describe('line follower mask fields', () => {
  test('normalizes four-line values to a two-digit hexadecimal mask', () => {
    const field = new FieldLine4('0a')

    expect(field.getValue()).toBe('0a')
    field.setValue('1f')
    expect(field.getValue()).toBe('0f')
    field.setValue('invalid')
    expect(field.getValue()).toBe('00')
  })

  test('keeps the existing six-line mask range', () => {
    const field = new FieldLine6('23')

    expect(field.getValue()).toBe('23')
    field.setValue('ff')
    expect(field.getValue()).toBe('3f')
  })

  test('creates the four-line field with the shadow block', () => {
    const workspace = new Blockly.Workspace()
    const block = workspace.newBlock('line4')

    expect(block.getField('LINE4')).toBeInstanceOf(FieldLine4)
    workspace.dispose()
  })
})
