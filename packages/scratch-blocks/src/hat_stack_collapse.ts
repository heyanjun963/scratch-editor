/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'

const TOGGLE_WIDTH = 34
const TOGGLE_HEIGHT = 28
const DOT_RADIUS = 2
const DOT_GAP = 7

const createToggleIcon = (collapsed: boolean) => {
  const triangle = collapsed ? 'M18 8L25 14L18 20Z' : 'M14 11L21 19L28 11Z'
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 28">',
    '<circle cx="21" cy="14" r="12" fill="#fff" fill-opacity=".28"/>',
    `<path d="${triangle}" fill="#fff"/>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const EXPANDED_ICON = createToggleIcon(false)
const COLLAPSED_ICON = createToggleIcon(true)

const getToggleLabel = (collapsed: boolean) => {
  const message = collapsed ? Blockly.Msg.EXPAND_BLOCK : Blockly.Msg.COLLAPSE_BLOCK
  return message || (collapsed ? 'Expand blocks' : 'Collapse blocks')
}

export interface HatStackChildView {
  getConnections_(all: boolean): HatStackConnectionView[]
  getDescendants(ordered: boolean): HatStackChildView[]
  getSvgRoot(): SVGGElement
}

export interface HatStackConnectionView {
  setTracking(track: boolean): void
}

export interface HatStackBlockView {
  RTL: boolean
  height: number
  width: number
  workspace: {
    resizeContents(): void
  }
  getColour(): string
  getNextBlock(): HatStackChildView | null
  getSvgRoot(): SVGGElement
}

class HatStackToggleField extends Blockly.FieldImage {
  private collapsed = false

  constructor(onToggle: () => void) {
    super(EXPANDED_ICON, TOGGLE_WIDTH, TOGGLE_HEIGHT, getToggleLabel(false), onToggle, true)
    this.setTooltip(() => getToggleLabel(this.collapsed))
  }

  override initView() {
    super.initView()
    this.fieldGroup_?.classList.add('blocklyHatStackToggle')
  }

  override isClickableInFlyout(): boolean {
    return false
  }

  setStackCollapsed(collapsed: boolean) {
    this.collapsed = collapsed
    this.setValue(collapsed ? COLLAPSED_ICON : EXPANDED_ICON)
    this.setAlt(getToggleLabel(collapsed))
  }
}

/**
 * 控制帽子积木后续积木的显示状态，折叠只影响视图，不改变连接和执行顺序。
 */
export class HatStackCollapseController {
  private collapsed = false
  private collapsedDots: SVGGElement | null = null
  private readonly displayBeforeCollapse = new Map<HatStackChildView, string>()
  private readonly trackedConnections = new Set<HatStackConnectionView>()
  private readonly toggleField: HatStackToggleField

  constructor(private readonly block: HatStackBlockView) {
    this.toggleField = new HatStackToggleField(() => this.setCollapsed(!this.collapsed))
  }

  getField(): Blockly.FieldImage {
    return this.toggleField
  }

  isCollapsed(): boolean {
    return this.collapsed
  }

  setCollapsed(collapsed: boolean) {
    if (this.collapsed === collapsed) return
    this.collapsed = collapsed
    this.toggleField.setStackCollapsed(collapsed)
    if (collapsed) {
      this.hideStack()
    } else {
      this.showStack()
    }
    this.refreshIndicator()
    this.block.workspace.resizeContents()
  }

  /** 帽子颜色或主题变化后同步折叠提示点。 */
  refreshIndicator() {
    this.collapsedDots?.remove()
    this.collapsedDots = null
    if (!this.collapsed) return

    const x = this.block.RTL ? this.block.width - DOT_GAP * 2 - 14 : 14
    const y = this.block.height + 7
    const root = this.block.getSvgRoot()
    this.collapsedDots = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.G,
      {
        class: 'blocklyHatStackCollapsedDots',
        transform: `translate(${x}, ${y})`,
      },
      root,
    )
    for (let index = 0; index < 3; index++) {
      Blockly.utils.dom.createSvgElement(
        Blockly.utils.Svg.CIRCLE,
        {
          cx: String(index * DOT_GAP),
          cy: '0',
          r: String(DOT_RADIUS),
          fill: this.block.getColour(),
        },
        this.collapsedDots,
      )
    }
  }

  private getStackBlocks(): HatStackChildView[] {
    return this.block.getNextBlock()?.getDescendants(false) ?? []
  }

  private hideStack() {
    this.displayBeforeCollapse.clear()
    this.trackedConnections.clear()
    for (const child of this.getStackBlocks()) {
      const root = child.getSvgRoot()
      this.displayBeforeCollapse.set(child, root.style.display)
      root.style.display = 'none'
      for (const connection of child.getConnections_(false)) {
        connection.setTracking(false)
        this.trackedConnections.add(connection)
      }
    }
  }

  private showStack() {
    for (const [child, display] of this.displayBeforeCollapse) {
      child.getSvgRoot().style.display = display
    }
    this.displayBeforeCollapse.clear()
    for (const connection of this.trackedConnections) {
      connection.setTracking(true)
    }
    this.trackedConnections.clear()
  }
}
