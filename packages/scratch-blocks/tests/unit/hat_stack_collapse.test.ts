/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, test, vi } from 'vitest'
import {
  HatStackCollapseController,
  type HatStackBlockView,
  type HatStackChildView,
  type HatStackConnectionView,
} from '../../src/hat_stack_collapse'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const createSvgGroup = (display = '') => {
  const group = document.createElementNS(SVG_NAMESPACE, 'g')
  group.style.display = display
  return group
}

const createControllerFixture = () => {
  const firstRoot = createSvgGroup('inline')
  const secondRoot = createSvgGroup()
  const firstConnection: HatStackConnectionView = { setTracking: vi.fn() }
  const secondConnection: HatStackConnectionView = { setTracking: vi.fn() }
  const descendants: HatStackChildView[] = [
    {
      getConnections_: () => [firstConnection],
      getDescendants: () => descendants,
      getSvgRoot: () => firstRoot,
    },
    {
      getConnections_: () => [secondConnection],
      getDescendants: () => [],
      getSvgRoot: () => secondRoot,
    },
  ]
  const nextBlock = descendants[0]
  const blockRoot = createSvgGroup()
  const resizeContents = vi.fn()
  const block: HatStackBlockView = {
    RTL: false,
    height: 48,
    width: 180,
    workspace: { resizeContents },
    getColour: () => '#ffbf00',
    getNextBlock: () => nextBlock,
    getSvgRoot: () => blockRoot,
  }

  return {
    blockRoot,
    controller: new HatStackCollapseController(block),
    firstConnection,
    firstRoot,
    resizeContents,
    secondConnection,
    secondRoot,
  }
}

describe('HatStackCollapseController', () => {
  test('hides the stack and draws three dots in the hat colour', () => {
    const { blockRoot, controller, firstConnection, firstRoot, resizeContents, secondConnection, secondRoot } =
      createControllerFixture()

    controller.setCollapsed(true)

    expect(controller.isCollapsed()).toBe(true)
    expect(firstRoot.style.display).toBe('none')
    expect(secondRoot.style.display).toBe('none')
    expect(firstConnection.setTracking).toHaveBeenCalledWith(false)
    expect(secondConnection.setTracking).toHaveBeenCalledWith(false)
    const dots = blockRoot.querySelectorAll('.blocklyHatStackCollapsedDots circle')
    expect(dots).toHaveLength(3)
    expect(Array.from(dots).every(dot => dot.getAttribute('fill') === '#ffbf00')).toBe(true)
    expect(resizeContents).toHaveBeenCalledOnce()
  })

  test('restores each descendant display value when expanded', () => {
    const { controller, firstConnection, firstRoot, resizeContents, secondConnection, secondRoot } =
      createControllerFixture()
    controller.setCollapsed(true)

    controller.setCollapsed(false)

    expect(controller.isCollapsed()).toBe(false)
    expect(firstRoot.style.display).toBe('inline')
    expect(secondRoot.style.display).toBe('')
    expect(firstConnection.setTracking).toHaveBeenLastCalledWith(true)
    expect(secondConnection.setTracking).toHaveBeenLastCalledWith(true)
    expect(resizeContents).toHaveBeenCalledTimes(2)
  })
})
