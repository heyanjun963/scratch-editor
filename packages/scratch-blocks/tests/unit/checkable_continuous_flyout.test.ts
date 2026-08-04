/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, test } from 'vitest'
import { CheckableContinuousFlyout } from '../../src/checkable_continuous_flyout'

describe('CheckableContinuousFlyout', () => {
  test('keeps a fixed width when blocks extend beyond the flyout', () => {
    const flyout = Object.create(CheckableContinuousFlyout.prototype) as CheckableContinuousFlyout

    expect(flyout.getWidth()).toBe(250)
  })
})
