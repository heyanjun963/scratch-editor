/**
 * Copyright 2026 Hiwonder
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file 16×8 点阵屏字段，提供遮罩编辑弹框、图案库和 128 位值序列化。
 */
import * as Blockly from 'blockly/core'

/** 点阵屏字段按“行内 16 列、共 8 行”的顺序保存灯点状态。 */
export class FieldLedMatrix extends Blockly.Field<string> {
  SERIALIZABLE = true
  EDITABLE = true

  static readonly COLUMN_COUNT = 16
  static readonly ROW_COUNT = 8
  static readonly CELL_COUNT = FieldLedMatrix.COLUMN_COUNT * FieldLedMatrix.ROW_COUNT
  static readonly ZEROS = '0'.repeat(FieldLedMatrix.CELL_COUNT)
  static readonly ONES = '1'.repeat(FieldLedMatrix.CELL_COUNT)
  static readonly DEFAULT_VALUE = FieldLedMatrix.ONES
  static readonly PREVIEW_CELL_SIZE = 2
  static readonly PREVIEW_CELL_GAP = 1
  static readonly ARROW_SIZE = 12
  static readonly ACTIVE_COLOUR = '#ff9f1a'
  static readonly INACTIVE_COLOUR = '#d9dde7'
  static readonly STORAGE_KEY = 'scratch-editor.led-matrix-patterns.v1'
  static readonly BUILTIN_PATTERNS = [
    '00000000000000000000000000000000000001000000000000001010101010101010111011010101010010101001010110101010100101010000000000000000',
    '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
    '00000000000000000110000000000000100101000000000010010100000000101001011101110111101101010101001001100110011100110001100000000000',
    '10100000101000001010000010100000101000001010000010101110101001101110101010101001101011101010100110101000101010011010111010100110',
    '00100000000001000010000000000100000100000000100000001000000100000000011111100000000000000000000000000000000000000000000000000000',
    '00001110011100000001111111111000000111111111100000011111111110000000111111110000000001111110000000000011110000000000000110000000',
    '00011000001100000000110001100000000001101100000000000011100000000000001110000000000001101100000000001100011000000001100000110000',
    '00000011100000000000010101000000000010010010000000011111111100000000000100000000000000010000000000000101000000000000001100000000',
    '00011000100000000011100100100100010110100100011011111111111111111111111111111111011110100100011000111001001001000001100010000000',
    '00111000000000000111000000000000110000000000000010000000000000001111111111111111111111111111000111111111111111110000000000000000',
  ]

  private originalStyle = ''
  private previewNodes_: SVGRectElement[] = []
  private editorNodes_: HTMLButtonElement[] = []
  private editorEventWrappers_: Blockly.browserEvents.Data[] = []
  private galleryEventWrappers_: Blockly.browserEvents.Data[] = []
  private pendingValue_ = FieldLedMatrix.DEFAULT_VALUE
  private dragging_ = false
  private paintValue_: '0' | '1' = '1'
  private modalOverlay_: HTMLDivElement | null = null
  private gallery_: HTMLDivElement | null = null
  private selectedPatternIndex_ = -1
  private playbackTimer_: ReturnType<typeof setInterval> | null = null
  private playButton_: HTMLButtonElement | null = null

  constructor(value = FieldLedMatrix.DEFAULT_VALUE) {
    const normalized = FieldLedMatrix.normalizeValue_(value)
    super(normalized)
    this.pendingValue_ = normalized
  }

  /** Blockly 从 JSON / XML 反序列化时通过该入口创建字段。 */
  static fromJson(options: FieldLedMatrixConfig): FieldLedMatrix {
    return new FieldLedMatrix(options.ledmatrix || options.value || FieldLedMatrix.DEFAULT_VALUE)
  }

  /** 外部值只允许 0/1；短值补零、长值截断，脏值回退为空画面。 */
  private static normalizeValue_(value: string): string {
    const normalized = String(value || '').trim()
    if (!normalized) return FieldLedMatrix.DEFAULT_VALUE
    if (!/^[01]+$/.test(normalized)) return FieldLedMatrix.ZEROS
    return normalized.slice(0, FieldLedMatrix.CELL_COUNT).padEnd(FieldLedMatrix.CELL_COUNT, '0')
  }

  doClassValidation_(value: string) {
    return FieldLedMatrix.normalizeValue_(value)
  }

  doValueUpdate_(newValue: string) {
    super.doValueUpdate_(FieldLedMatrix.normalizeValue_(newValue))
    this.updatePreview_()
  }

  /** 在积木圆角输入内绘制 16×8 缩略图和下拉箭头。 */
  initView() {
    this.updateSize_()
    const constants = this.getConstants() as Blockly.zelos.ConstantProvider
    const startX = constants.GRID_UNIT
    const previewHeight =
      FieldLedMatrix.ROW_COUNT * (FieldLedMatrix.PREVIEW_CELL_SIZE + FieldLedMatrix.PREVIEW_CELL_GAP)
    const startY = (this.size_.height - previewHeight) / 2

    this.previewNodes_ = []
    for (let row = 0; row < FieldLedMatrix.ROW_COUNT; row++) {
      for (let column = 0; column < FieldLedMatrix.COLUMN_COUNT; column++) {
        const node = Blockly.utils.dom.createSvgElement(
          'rect',
          {
            x: startX + column * (FieldLedMatrix.PREVIEW_CELL_SIZE + FieldLedMatrix.PREVIEW_CELL_GAP),
            y: startY + row * (FieldLedMatrix.PREVIEW_CELL_SIZE + FieldLedMatrix.PREVIEW_CELL_GAP),
            width: FieldLedMatrix.PREVIEW_CELL_SIZE,
            height: FieldLedMatrix.PREVIEW_CELL_SIZE,
            rx: 1,
            ry: 1,
          },
          this.fieldGroup_,
        ) as SVGRectElement
        this.previewNodes_.push(node)
      }
    }

    const arrowX = this.size_.width - constants.GRID_UNIT - FieldLedMatrix.ARROW_SIZE
    const arrowY = (this.size_.height - FieldLedMatrix.ARROW_SIZE) / 2
    const arrow = Blockly.utils.dom.createSvgElement(
      'image',
      {
        height: `${FieldLedMatrix.ARROW_SIZE}px`,
        width: `${FieldLedMatrix.ARROW_SIZE}px`,
        transform: `translate(${arrowX}, ${arrowY})`,
      },
      this.fieldGroup_,
    )
    arrow.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      constants.FIELD_DROPDOWN_SVG_ARROW_DATAURI ?? '',
    )
    this.updatePreview_()
  }

  /** 点击字段后打开覆盖编辑区的模态弹框，确认前只修改临时值。 */
  showEditor_() {
    if (this.modalOverlay_) return
    const sourceBlock = this.getSourceBlock() as Blockly.BlockSvg
    if (sourceBlock.isShadow()) {
      this.originalStyle = sourceBlock.getStyleName()
      sourceBlock.setStyle(`${this.originalStyle}_selected`)
    }

    this.pendingValue_ = FieldLedMatrix.normalizeValue_(this.getValue() || FieldLedMatrix.DEFAULT_VALUE)
    this.selectedPatternIndex_ = this.getPatterns_().indexOf(this.pendingValue_)
    this.modalOverlay_ = this.createEditor_()
    document.body.appendChild(this.modalOverlay_)
    this.updateEditor_()
  }

  /** 创建与旧版一致的遮罩弹框、大点阵、图案库和底部操作区。 */
  private createEditor_(): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.zIndex = '100000'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.background = 'rgba(0, 0, 0, 0.55)'
    overlay.style.userSelect = 'none'

    const dialog = document.createElement('div')
    dialog.style.position = 'relative'
    dialog.style.boxSizing = 'border-box'
    dialog.style.width = '650px'
    dialog.style.maxWidth = 'calc(100vw - 32px)'
    dialog.style.maxHeight = 'calc(100vh - 32px)'
    dialog.style.padding = '10px 10px 8px'
    dialog.style.border = '3px solid #8b8b8b'
    dialog.style.borderRadius = '22px'
    dialog.style.background = '#f4f4f4'
    dialog.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.35)'
    dialog.style.overflow = 'hidden'
    overlay.appendChild(dialog)

    const closeButton = this.createActionButton_('×', '#8b8b8b', '#ffffff')
    closeButton.setAttribute('aria-label', '关闭点阵编辑器')
    closeButton.style.position = 'absolute'
    closeButton.style.top = '4px'
    closeButton.style.right = '4px'
    closeButton.style.zIndex = '1'
    dialog.appendChild(closeButton)

    const confirmButton = this.createActionButton_('✓', '#19d839', '#ffffff')
    confirmButton.setAttribute('aria-label', '确认点阵图案')
    confirmButton.style.position = 'absolute'
    confirmButton.style.top = '52px'
    confirmButton.style.right = '4px'
    confirmButton.style.zIndex = '1'
    dialog.appendChild(confirmButton)

    const grid = document.createElement('div')
    grid.style.display = 'grid'
    grid.style.gridTemplateColumns = `repeat(${FieldLedMatrix.COLUMN_COUNT}, 30px)`
    grid.style.gap = '6px'
    grid.style.padding = '0 0 10px'
    grid.style.justifyContent = 'center'
    this.editorNodes_ = []
    for (let index = 0; index < FieldLedMatrix.CELL_COUNT; index++) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.setAttribute('aria-label', `切换点阵第 ${Math.floor(index / 16) + 1} 行第 ${(index % 16) + 1} 列`)
      cell.style.width = '30px'
      cell.style.height = '30px'
      cell.style.border = '0'
      cell.style.borderRadius = '7px'
      cell.style.padding = '0'
      cell.style.cursor = 'pointer'
      this.editorNodes_.push(cell)
      grid.appendChild(cell)
      this.editorEventWrappers_.push(
        Blockly.browserEvents.bind(cell, 'mousedown', this, (event: Event) => {
          if ((event as MouseEvent).button !== 0) return
          this.dragging_ = true
          this.paintValue_ = this.pendingValue_[index] === '1' ? '0' : '1'
          this.setPendingCell_(index, this.paintValue_)
        }),
      )
      this.editorEventWrappers_.push(
        Blockly.browserEvents.bind(cell, 'mouseenter', this, () => {
          if (this.dragging_) this.setPendingCell_(index, this.paintValue_)
        }),
      )
    }
    dialog.appendChild(grid)

    this.gallery_ = document.createElement('div')
    this.gallery_.style.display = 'grid'
    this.gallery_.style.gridTemplateColumns = 'repeat(4, 1fr)'
    this.gallery_.style.gap = '8px 16px'
    this.gallery_.style.height = '142px'
    this.gallery_.style.padding = '10px 14px'
    this.gallery_.style.overflowY = 'auto'
    this.gallery_.style.background = '#ffffff'
    this.renderGallery_()
    dialog.appendChild(this.gallery_)

    const quickActions = document.createElement('div')
    quickActions.style.display = 'flex'
    quickActions.style.justifyContent = 'center'
    quickActions.style.gap = '8px'
    quickActions.style.padding = '7px 0 6px'
    const clearButton = this.createTextButton_('清空')
    const fillButton = this.createTextButton_('全亮')
    quickActions.append(clearButton, fillButton)
    dialog.appendChild(quickActions)

    const footer = document.createElement('div')
    footer.style.display = 'flex'
    footer.style.gap = '2px'
    const saveButton = this.createFooterButton_('保存图案')
    const deleteButton = this.createFooterButton_('删除图案')
    this.playButton_ = this.createFooterButton_('播放图案')
    footer.append(saveButton, deleteButton, this.playButton_)
    dialog.appendChild(footer)

    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(document.body, 'mouseup', this, () => {
        this.dragging_ = false
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(document, 'keydown', this, (event: Event) => {
        if ((event as KeyboardEvent).key === 'Escape') this.closeEditor_(false)
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(closeButton, 'click', this, () => {
        this.closeEditor_(false)
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(clearButton, 'click', this, () => {
        this.pendingValue_ = FieldLedMatrix.ZEROS
        this.selectedPatternIndex_ = this.getPatterns_().indexOf(this.pendingValue_)
        this.updateEditor_()
        this.renderGallery_()
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(fillButton, 'click', this, () => {
        this.pendingValue_ = FieldLedMatrix.ONES
        this.selectedPatternIndex_ = this.getPatterns_().indexOf(this.pendingValue_)
        this.updateEditor_()
        this.renderGallery_()
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(confirmButton, 'click', this, () => {
        this.closeEditor_(true)
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(saveButton, 'click', this, () => {
        this.saveCurrentPattern_()
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(deleteButton, 'click', this, () => {
        this.deleteSelectedPattern_()
      }),
    )
    this.editorEventWrappers_.push(
      Blockly.browserEvents.bind(this.playButton_, 'click', this, () => {
        this.togglePlayback_()
      }),
    )
    return overlay
  }

  /** 图案库缩略图也使用 16×8 排列，点击后把图案载入上方编辑区。 */
  private renderGallery_() {
    if (!this.gallery_) return
    const gallery = this.gallery_
    this.galleryEventWrappers_.forEach((wrapper) => Blockly.browserEvents.unbind(wrapper))
    this.galleryEventWrappers_ = []
    this.gallery_.replaceChildren()
    this.getPatterns_().forEach((pattern, patternIndex) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('aria-label', `载入第 ${patternIndex + 1} 个点阵图案`)
      button.style.display = 'grid'
      button.style.gridTemplateColumns = 'repeat(16, 5px)'
      button.style.gap = '1px'
      button.style.justifyContent = 'center'
      button.style.padding = '5px'
      button.style.border =
        patternIndex === this.selectedPatternIndex_ ? '2px solid #19d839' : '2px solid transparent'
      button.style.borderRadius = '5px'
      button.style.background = '#ffffff'
      button.style.cursor = 'pointer'
      for (const value of pattern) {
        const cell = document.createElement('span')
        cell.style.width = '5px'
        cell.style.height = '5px'
        cell.style.borderRadius = '1px'
        cell.style.background = value === '1' ? FieldLedMatrix.ACTIVE_COLOUR : '#cfcfcf'
        button.appendChild(cell)
      }
      gallery.appendChild(button)
      this.galleryEventWrappers_.push(
        Blockly.browserEvents.bind(button, 'click', this, () => {
          this.selectedPatternIndex_ = patternIndex
          this.pendingValue_ = pattern
          this.updateEditor_()
          this.renderGallery_()
        }),
      )
    })
  }

  /** 创建关闭和确认使用的圆形按钮。 */
  private createActionButton_(text: string, background: string, color: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = text
    button.style.width = '30px'
    button.style.height = '30px'
    button.style.border = '0'
    button.style.borderRadius = '50%'
    button.style.background = background
    button.style.color = color
    button.style.cursor = 'pointer'
    button.style.fontWeight = '700'
    button.style.fontSize = '20px'
    button.style.lineHeight = '30px'
    button.style.padding = '0'
    return button
  }

  /** 创建清空和全亮操作按钮。 */
  private createTextButton_(text: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = text
    button.style.border = '0'
    button.style.borderRadius = '4px'
    button.style.padding = '5px 12px'
    button.style.background = '#d9dde7'
    button.style.color = '#575e75'
    button.style.cursor = 'pointer'
    return button
  }

  /** 创建弹框底部等宽的保存、删除和播放按钮。 */
  private createFooterButton_(text: string): HTMLButtonElement {
    const button = this.createTextButton_(text)
    button.style.flex = '1'
    button.style.height = '40px'
    button.style.border = '1px solid #bdbdbd'
    button.style.borderRadius = '20px'
    button.style.background = '#ffffff'
    button.style.color = FieldLedMatrix.ACTIVE_COLOUR
    button.style.fontWeight = '600'
    return button
  }

  /** 拖动绘制时只更新指定灯点。 */
  private setPendingCell_(index: number, value: '0' | '1') {
    this.pendingValue_ = `${this.pendingValue_.slice(0, index)}${value}${this.pendingValue_.slice(index + 1)}`
    this.selectedPatternIndex_ = this.getPatterns_().indexOf(this.pendingValue_)
    this.updateEditor_()
  }

  /** 合并安装内置图案和用户保存在浏览器本地的自定义图案。 */
  private getPatterns_(): string[] {
    let savedPatterns: string[] = []
    try {
      const rawValue = globalThis.localStorage?.getItem(FieldLedMatrix.STORAGE_KEY)
      const parsedValue = rawValue ? JSON.parse(rawValue) : []
      if (Array.isArray(parsedValue)) {
        savedPatterns = parsedValue
          .map(String)
          .filter((value) => /^[01]{128}$/.test(value) && !FieldLedMatrix.BUILTIN_PATTERNS.includes(value))
      }
    } catch (error) {
      console.warn('[FieldLedMatrix.getPatterns_] 无法读取本地点阵图案', error)
    }
    return [...FieldLedMatrix.BUILTIN_PATTERNS, ...savedPatterns]
  }

  /** 保存当前图案，桌面端和 Web 端共用 localStorage，不依赖 Electron 文件系统。 */
  private saveCurrentPattern_() {
    const patterns = this.getPatterns_()
    const existingIndex = patterns.indexOf(this.pendingValue_)
    if (existingIndex >= 0) {
      this.selectedPatternIndex_ = existingIndex
      this.renderGallery_()
      return
    }
    const customPatterns = patterns.slice(FieldLedMatrix.BUILTIN_PATTERNS.length)
    customPatterns.unshift(this.pendingValue_)
    try {
      globalThis.localStorage?.setItem(FieldLedMatrix.STORAGE_KEY, JSON.stringify(customPatterns))
      this.selectedPatternIndex_ = FieldLedMatrix.BUILTIN_PATTERNS.length
      this.renderGallery_()
    } catch (error) {
      console.warn('[FieldLedMatrix.saveCurrentPattern_] 无法保存本地点阵图案', error)
    }
  }

  /** 只删除用户保存的图案，安装内置图库保持稳定。 */
  private deleteSelectedPattern_() {
    if (this.selectedPatternIndex_ < FieldLedMatrix.BUILTIN_PATTERNS.length) return
    const customPatterns = this.getPatterns_().slice(FieldLedMatrix.BUILTIN_PATTERNS.length)
    customPatterns.splice(this.selectedPatternIndex_ - FieldLedMatrix.BUILTIN_PATTERNS.length, 1)
    try {
      globalThis.localStorage?.setItem(FieldLedMatrix.STORAGE_KEY, JSON.stringify(customPatterns))
      this.selectedPatternIndex_ = -1
      this.renderGallery_()
    } catch (error) {
      console.warn('[FieldLedMatrix.deleteSelectedPattern_] 无法删除本地点阵图案', error)
    }
  }

  /** 播放时依次载入图库图案，再次点击立即停止。 */
  private togglePlayback_() {
    if (this.playbackTimer_) {
      this.stopPlayback_()
      return
    }
    const patterns = this.getPatterns_()
    if (!patterns.length || !this.playButton_) return
    let index = 0
    this.playButton_.textContent = '停止播放'
    this.playbackTimer_ = setInterval(() => {
      this.selectedPatternIndex_ = index
      this.pendingValue_ = patterns[index]
      this.updateEditor_()
      this.renderGallery_()
      index = (index + 1) % patterns.length
    }, 600)
  }

  private stopPlayback_() {
    if (this.playbackTimer_) clearInterval(this.playbackTimer_)
    this.playbackTimer_ = null
    if (this.playButton_) this.playButton_.textContent = '播放图案'
  }

  private updatePreview_() {
    const value = FieldLedMatrix.normalizeValue_(this.getValue() || FieldLedMatrix.DEFAULT_VALUE)
    ;(this.previewNodes_ || []).forEach((node, index) => {
      node.setAttribute('fill', value[index] === '1' ? FieldLedMatrix.ACTIVE_COLOUR : FieldLedMatrix.INACTIVE_COLOUR)
    })
  }

  private updateEditor_() {
    ;(this.editorNodes_ || []).forEach((node, index) => {
      node.style.background =
        this.pendingValue_[index] === '1' ? FieldLedMatrix.ACTIVE_COLOUR : FieldLedMatrix.INACTIVE_COLOUR
    })
  }

  /** 关闭弹框时提交或丢弃临时值，并清理全局事件与播放定时器。 */
  private closeEditor_(commit: boolean) {
    if (commit) this.setValue(this.pendingValue_)
    this.stopPlayback_()
    const sourceBlock = this.getSourceBlock()
    if (sourceBlock?.isShadow()) sourceBlock.setStyle(this.originalStyle)
    this.editorEventWrappers_.forEach((wrapper) => Blockly.browserEvents.unbind(wrapper))
    this.galleryEventWrappers_.forEach((wrapper) => Blockly.browserEvents.unbind(wrapper))
    this.editorEventWrappers_ = []
    this.galleryEventWrappers_ = []
    this.editorNodes_ = []
    this.dragging_ = false
    this.gallery_ = null
    this.playButton_ = null
    this.modalOverlay_?.remove()
    this.modalOverlay_ = null
    this.updatePreview_()
  }

  updateSize_() {
    const constants = this.getConstants() as Blockly.zelos.ConstantProvider
    const previewWidth =
      FieldLedMatrix.COLUMN_COUNT * (FieldLedMatrix.PREVIEW_CELL_SIZE + FieldLedMatrix.PREVIEW_CELL_GAP)
    this.size_.height = constants.FIELD_TEXT_HEIGHT
    this.size_.width = constants.GRID_UNIT * 3 + previewWidth + FieldLedMatrix.ARROW_SIZE
    this.positionBorderRect_()
  }

  getClickTarget_() {
    return (this.getSourceBlock() as Blockly.BlockSvg).getSvgRoot()
  }

  dispose() {
    if (this.modalOverlay_) this.closeEditor_(false)
    super.dispose()
  }
}

interface FieldLedMatrixConfig extends Blockly.FieldConfig {
  ledmatrix?: string
  value?: string
}

/** 注册字段类型，供 JSON 形式的 led_matrix shadow 使用。 */
export function registerFieldLedMatrix() {
  Blockly.fieldRegistry.register('field_led_matrix', FieldLedMatrix)
}
