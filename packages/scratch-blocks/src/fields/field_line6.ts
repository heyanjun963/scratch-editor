/**
 * Visual Blocks Editor
 *
 * Copyright 2016 Massachusetts Institute of Technology
 * All rights reserved.
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
 * @file 巡线传感器状态输入字段，提供四路和六路共用的位掩码交互。
 */
import * as Blockly from 'blockly/core'

/**
 * 巡线字段负责把“多个探头亮/不亮”的可视化选择，转换成 Python 模板需要的十六进制掩码。
 *
 * 数据约定：
 * - 用户看到的是按传感器通道数排列的圆点。
 * - 字段真实值保存为两位十六进制，例如第 1、2 路点亮就是 0x03。
 * - VM / Python codegen 只关心字段值，不关心弹层 UI。
 */
export class FieldLine6 extends Blockly.Field<string> {
  SERIALIZABLE = true
  EDITABLE = true

  // shadow block 被选中时会临时换样式，关闭弹层时用 originalStyle 还原。
  private originalStyle = ''
  // 积木本体上的小圆点缩略图，数量由传感器通道数决定。
  private previewNodes_: SVGCircleElement[] = []
  // 弹层里的可点击圆点，编辑中的临时值变化时刷新。
  private editorNodes_: HTMLElement[] = []
  // Blockly 事件需要手动解绑，否则频繁打开弹层会积累事件监听。
  private editorEventWrappers_: Blockly.browserEvents.Data[] = []
  // 弹层编辑中的临时值；只有点击绿色确认按钮才写回真正字段值。
  private pendingValue_ = '00'
  // 四路和六路字段共用同一交互，只通过通道数、最大掩码和标题区分。
  private readonly channelCount_: number
  private readonly maxMask_: number
  private readonly editorTitle_: string

  static readonly CHANNEL_COUNT = 6
  static readonly DEFAULT_VALUE = '00'
  static readonly MAX_MASK = 0x3f
  static readonly PREVIEW_NODE_RADIUS = 4
  static readonly PREVIEW_NODE_GAP = 5
  static readonly PREVIEW_NODE_SIZE = 8
  static readonly ARROW_SIZE = 12
  static readonly ACTIVE_COLOUR = '#2f80ed'
  static readonly INACTIVE_COLOUR = '#d9dde7'
  static readonly STROKE_COLOUR = '#ffffff'

  constructor(
    value = FieldLine6.DEFAULT_VALUE,
    channelCount = FieldLine6.CHANNEL_COUNT,
    editorTitle = '六路巡线状态',
  ) {
    const maxMask = (1 << channelCount) - 1
    super(FieldLine6.normalizeValue_(value, maxMask))
    this.channelCount_ = channelCount
    this.maxMask_ = maxMask
    this.editorTitle_ = editorTitle
    this.pendingValue_ = FieldLine6.normalizeValue_(value, maxMask)
  }

  /**
   * Blockly 从 JSON / XML 反序列化 shadow block 时会走这里创建字段实例。
   * @param options 字段配置，line6 是可选默认值。
   * @returns 六路巡线字段实例。
   */
  static fromJson(options: FieldLineConfig): FieldLine6 {
    return new FieldLine6(options.line6 || FieldLine6.DEFAULT_VALUE)
  }

  /**
   * 把外部传入值统一规整成两位十六进制，避免保存脏值影响代码生成。
   *
   * 通道按低位到高位映射：
   * - 第 1 路是 0x01
   * - 第 2 路是 0x02
   * - 第 n 路是 1 << (n - 1)
   *
   * @param value 字段值，允许 23、0x23、空值等输入。
   * @returns 规整后的两位十六进制掩码。
   */
  private static normalizeValue_(value: string, maxMask = FieldLine6.MAX_MASK): string {
    const normalized = String(value || FieldLine6.DEFAULT_VALUE)
      .trim()
      .toLowerCase()
      .replace(/^0x/, '')
    const parsed = Number.parseInt(normalized, 16)
    if (Number.isNaN(parsed)) return FieldLine6.DEFAULT_VALUE
    return (parsed & maxMask).toString(16).padStart(2, '0')
  }

  /**
   * 把字段值转成数字掩码，供圆点渲染和通道切换使用。
   * @param value 字段值。
   * @returns 限制在当前通道范围内的位掩码。
   */
  private static valueToMask_(value: string, maxMask = FieldLine6.MAX_MASK): number {
    return Number.parseInt(FieldLine6.normalizeValue_(value, maxMask), 16) & maxMask
  }

  /**
   * 把数字掩码转回字段保存值，最终会进入 Python 模板里的 0x{LINE}。
   * @param mask 巡线状态位掩码。
   * @returns 两位十六进制字段值。
   */
  private static maskToValue_(mask: number, maxMask = FieldLine6.MAX_MASK): string {
    return (mask & maxMask).toString(16).padStart(2, '0')
  }

  /**
   * Blockly 写入字段前会调用这里校验值；返回值就是最终进入字段的值。
   * @param value 候选字段值。
   * @returns 规整后的字段值。
   */
  doClassValidation_(value: string) {
    return FieldLine6.normalizeValue_(value, this.maxMask_)
  }

  /**
   * 字段值真正变化后刷新积木本体上的缩略圆点。
   * @param newValue 新字段值。
   */
  doValueUpdate_(newValue: string) {
    super.doValueUpdate_(FieldLine6.normalizeValue_(newValue, this.maxMask_))
    this.updatePreview_()
  }

  /**
   * 字段第一次放到积木上时创建积木本体 UI，也就是小圆点缩略图和下拉箭头。
   */
  initView() {
    this.updateSize_()
    const constants = this.getConstants() as Blockly.zelos.ConstantProvider
    const startX = constants.GRID_UNIT
    const centerY = this.size_.height / 2

    this.previewNodes_ = []
    for (let i = 0; i < this.channelCount_; i++) {
      // 缩略图只负责展示当前状态，不直接提交值；真正编辑在 DropDownDiv 弹层里完成。
      const x = startX + FieldLine6.PREVIEW_NODE_RADIUS + i * (
        FieldLine6.PREVIEW_NODE_SIZE + FieldLine6.PREVIEW_NODE_GAP
      )
      const circle = Blockly.utils.dom.createSvgElement(
        'circle',
        {
          cx: x,
          cy: centerY,
          r: FieldLine6.PREVIEW_NODE_RADIUS,
          stroke: FieldLine6.STROKE_COLOUR,
          'stroke-width': 1,
          cursor: 'pointer',
        },
        this.fieldGroup_,
      ) as SVGCircleElement
      this.previewNodes_.push(circle)
    }

    const arrowX = this.size_.width - constants.GRID_UNIT - FieldLine6.ARROW_SIZE
    const arrowY = (this.size_.height - FieldLine6.ARROW_SIZE) / 2
    const arrow = Blockly.utils.dom.createSvgElement(
      'image',
      {
        height: `${FieldLine6.ARROW_SIZE}px`,
        width: `${FieldLine6.ARROW_SIZE}px`,
        transform: `translate(${arrowX}, ${arrowY})`,
        cursor: 'pointer',
      },
      this.fieldGroup_,
    )
    arrow.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      this.getConstants()?.FIELD_DROPDOWN_SVG_ARROW_DATAURI ?? '',
    )

    this.updatePreview_()
  }

  /**
   * 用户点击字段时打开 Blockly 的 DropDownDiv 弹层，并把当前值复制到 pendingValue_。
   */
  showEditor_() {
    const sourceBlock = this.getSourceBlock() as Blockly.BlockSvg
    Blockly.DropDownDiv.setColour(sourceBlock.getColour(), sourceBlock.getColourTertiary())

    const style = sourceBlock.style
    if (sourceBlock.isShadow()) {
      this.originalStyle = sourceBlock.getStyleName()
      sourceBlock.setStyle(`${this.originalStyle}_selected`)
    } else if (this.borderRect_) {
      this.borderRect_.setAttribute(
        'fill',
        'colourQuaternary' in style ? String(style.colourQuaternary) : style.colourTertiary,
      )
    }

    this.pendingValue_ = FieldLine6.normalizeValue_(
      this.getValue() || FieldLine6.DEFAULT_VALUE,
      this.maxMask_,
    )
    const div = Blockly.DropDownDiv.getContentDiv()
    const wrapper = this.createEditor_()
    div.appendChild(wrapper)

    Blockly.DropDownDiv.showPositionedByBlock(this, sourceBlock, this.dropdownDispose_.bind(this))
    this.updateEditor_()
  }

  /**
   * 清理弹层事件，并把 shadow block 样式恢复到未选中状态。
   */
  dropdownDispose_() {
    const sourceBlock = this.getSourceBlock()
    if (sourceBlock?.isShadow()) {
      sourceBlock.setStyle(this.originalStyle)
    }
    this.editorEventWrappers_.forEach(wrapper => Blockly.browserEvents.unbind(wrapper))
    this.editorEventWrappers_ = []
    this.editorNodes_ = []
    this.updatePreview_()
  }

  /**
   * 创建巡线状态选择弹层。这里使用普通 HTML，交给 Blockly.DropDownDiv 挂载和定位。
   * @returns 弹层根节点。
   */
  private createEditor_(): HTMLDivElement {
    const wrapper = document.createElement('div')
    wrapper.style.boxSizing = 'border-box'
    wrapper.style.width = '224px'
    wrapper.style.padding = '10px 12px 12px'
    wrapper.style.userSelect = 'none'

    const header = document.createElement('div')
    header.style.display = 'flex'
    header.style.justifyContent = 'space-between'
    header.style.alignItems = 'center'
    header.style.marginBottom = '8px'
    header.style.fontSize = '12px'
    header.style.fontWeight = '600'
    header.style.color = '#575e75'
    header.textContent = this.editorTitle_

    const closeButton = this.createActionButton_('×', '#d9dde7', '#575e75')
    header.appendChild(closeButton)
    wrapper.appendChild(header)

    const labels = document.createElement('div')
    labels.style.display = 'grid'
    labels.style.gridTemplateColumns = `repeat(${this.channelCount_}, 1fr)`
    labels.style.gap = '6px'
    labels.style.marginBottom = '6px'
    labels.style.textAlign = 'center'
    labels.style.fontSize = '12px'
    labels.style.color = '#575e75'

    const buttons = document.createElement('div')
    buttons.style.display = 'grid'
    buttons.style.gridTemplateColumns = `repeat(${this.channelCount_}, 1fr)`
    buttons.style.gap = '6px'
    buttons.style.marginBottom = '12px'

    this.editorNodes_ = []
    for (let i = 0; i < this.channelCount_; i++) {
      const label = document.createElement('div')
      label.textContent = String(i + 1)
      labels.appendChild(label)

      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('aria-label', `切换第 ${i + 1} 路巡线状态`)
      button.style.width = '26px'
      button.style.height = '26px'
      button.style.border = '0'
      button.style.borderRadius = '50%'
      button.style.padding = '0'
      button.style.cursor = 'pointer'
      button.style.boxShadow = 'inset 0 0 0 2px #ffffff'
      button.style.justifySelf = 'center'
      this.editorNodes_.push(button)
      buttons.appendChild(button)

      // 点击圆点只修改 pendingValue_，不立即写回字段；绿色确认按钮才提交。
      this.editorEventWrappers_.push(Blockly.browserEvents.bind(button, 'click', this, () => {
        this.toggleChannel_(i)
      }))
    }

    wrapper.appendChild(labels)
    wrapper.appendChild(buttons)

    const footer = document.createElement('div')
    footer.style.display = 'flex'
    footer.style.justifyContent = 'flex-end'
    const confirmButton = this.createActionButton_('✓', '#2fbf71', '#ffffff')
    footer.appendChild(confirmButton)
    wrapper.appendChild(footer)

    this.editorEventWrappers_.push(Blockly.browserEvents.bind(closeButton, 'click', this, () => {
      Blockly.DropDownDiv.hideWithoutAnimation()
    }))
    this.editorEventWrappers_.push(Blockly.browserEvents.bind(confirmButton, 'click', this, () => {
      // setValue 会触发 Blockly 字段变更事件，VM 和 Python 代码生成都能读到新值。
      this.setValue(this.pendingValue_)
      Blockly.DropDownDiv.hideWithoutAnimation()
    }))

    return wrapper
  }

  /**
   * 创建弹层右上角关闭按钮和右下角确认按钮，保持按钮样式一致。
   * @param text 按钮文案。
   * @param background 背景色。
   * @param color 文字色。
   * @returns 圆形操作按钮。
   */
  private createActionButton_(text: string, background: string, color: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = text
    button.style.width = '24px'
    button.style.height = '24px'
    button.style.border = '0'
    button.style.borderRadius = '50%'
    button.style.background = background
    button.style.color = color
    button.style.cursor = 'pointer'
    button.style.fontWeight = '700'
    button.style.lineHeight = '24px'
    button.style.padding = '0'
    return button
  }

  /**
   * 切换指定通道对应的位，等待确认按钮提交到积木字段。
   * @param channelIndex 从 0 开始的通道序号，最大值由当前字段通道数决定。
   */
  private toggleChannel_(channelIndex: number) {
    const mask = FieldLine6.valueToMask_(this.pendingValue_, this.maxMask_) ^ (1 << channelIndex)
    this.pendingValue_ = FieldLine6.maskToValue_(mask, this.maxMask_)
    this.updateEditor_()
  }

  /**
   * 根据真实字段值刷新积木本体上的缩略圆点。
   */
  private updatePreview_() {
    const mask = FieldLine6.valueToMask_(this.getValue() || FieldLine6.DEFAULT_VALUE, this.maxMask_)
    // Blockly.Field 构造期间可能先触发 doValueUpdate_，此时子类 SVG 节点还没有创建。
    const previewNodes = this.previewNodes_ || []
    previewNodes.forEach((node, index) => {
      node.setAttribute('fill', mask & (1 << index) ? FieldLine6.ACTIVE_COLOUR : FieldLine6.INACTIVE_COLOUR)
    })
  }

  /**
   * 根据 pendingValue_ 刷新弹层里的圆点状态，蓝色表示该路被选中。
   */
  private updateEditor_() {
    const mask = FieldLine6.valueToMask_(this.pendingValue_, this.maxMask_)
    const editorNodes = this.editorNodes_ || []
    editorNodes.forEach((node, index) => {
      const active = Boolean(mask & (1 << index))
      node.style.background = active ? FieldLine6.ACTIVE_COLOUR : FieldLine6.INACTIVE_COLOUR
      node.style.outline = active ? '2px solid rgba(47, 128, 237, 0.35)' : 'none'
    })
  }

  /**
   * 计算字段在积木上的固定尺寸，避免圆点或箭头变化时导致积木抖动。
   */
  updateSize_() {
    const constants = this.getConstants() as Blockly.zelos.ConstantProvider
    const totalHeight = constants.FIELD_TEXT_HEIGHT

    this.size_.height = totalHeight
    this.size_.width =
      constants.GRID_UNIT * 2 +
      this.channelCount_ * FieldLine6.PREVIEW_NODE_SIZE +
      (this.channelCount_ - 1) * FieldLine6.PREVIEW_NODE_GAP +
      FieldLine6.ARROW_SIZE +
      constants.GRID_UNIT

    this.positionBorderRect_()
  }

  /**
   * 点击字段任意区域都打开弹层，而不是只点中某个圆点才响应。
   * @returns 当前字段所在积木的 SVG 根节点。
   */
  getClickTarget_() {
    return (this.getSourceBlock() as Blockly.BlockSvg).getSvgRoot()
  }
}

export interface FieldLineConfig extends Blockly.FieldConfig {
  line4?: string
  line6?: string
}

/**
 * 注册字段类型，blocks/line6.ts 中的 field_line6 会通过这里找到实现类。
 */
export function registerFieldLine6() {
  Blockly.fieldRegistry.register('field_line6', FieldLine6)
}
