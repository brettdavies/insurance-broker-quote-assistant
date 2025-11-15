/**
 * PillNode - Custom Lexical node for key-value pills
 *
 * Represents inline pill elements that display key-value pairs (e.g., k:5, deps:4)
 * with visual styling based on validation state.
 */

import type { ValidationResult } from '@/lib/pill-parser'
import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'

export interface PillNodePayload {
  key: string
  value: string
  validation: ValidationResult
  fieldName?: string
}

export type SerializedPillNode = Spread<
  {
    key: string
    value: string
    validation: ValidationResult
    fieldName?: string
  },
  SerializedLexicalNode
>

export class PillNode extends DecoratorNode<JSX.Element> {
  __key_: string
  __value: string
  __validation: ValidationResult
  __fieldName?: string

  static getType(): string {
    return 'pill'
  }

  static clone(node: PillNode): PillNode {
    return new PillNode(
      {
        key: node.__key_,
        value: node.__value,
        validation: node.__validation,
        fieldName: node.__fieldName,
      },
      node.__key
    )
  }

  constructor(payload: PillNodePayload, key?: NodeKey) {
    super(key)
    this.__key_ = payload.key
    this.__value = payload.value
    this.__validation = payload.validation
    this.__fieldName = payload.fieldName
  }

  createDOM(config: EditorConfig): HTMLElement {
    // Create simple container for the decorator content
    // The actual pill span with attributes is created in decorate()
    const span = document.createElement('span')
    span.className = 'pill-container'
    return span
  }

  updateDOM(): false {
    // Pills are immutable - always return false to trigger full re-render
    return false
  }

  static importJSON(serializedNode: SerializedPillNode): PillNode {
    return $createPillNode({
      key: serializedNode.key,
      value: serializedNode.value,
      validation: serializedNode.validation,
      fieldName: serializedNode.fieldName,
    })
  }

  exportJSON(): SerializedPillNode {
    return {
      type: 'pill',
      version: 1,
      key: this.__key_,
      value: this.__value,
      validation: this.__validation,
      fieldName: this.__fieldName,
    }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-pill')) {
          return null
        }
        return {
          conversion: convertPillElement,
          priority: 1,
        }
      },
    }
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.className = this.getPillClasses()
    element.setAttribute('data-pill', 'true')
    element.setAttribute('data-key', this.__key_)
    element.setAttribute('data-value', this.__value)
    // Use fieldName for display if available (normalized), otherwise use key
    const displayKey = this.__fieldName || this.__key_
    element.textContent = `${displayKey}:${this.__value}`
    return { element }
  }

  decorate(): JSX.Element {
    const nodeKey = this.getKey()
    // Use fieldName for display if available (normalized), otherwise use key
    const displayKey = this.__fieldName || this.__key_
    return (
      <span
        className={this.getPillClasses()}
        data-pill="true"
        data-pill-node-key={nodeKey}
        data-key={this.__key_}
        data-value={this.__value}
        data-validation={this.__validation}
        data-field-name={this.__fieldName}
      >
        {displayKey}:{this.__value}
      </span>
    )
  }

  getTextContent(): string {
    return `${this.__key_}:${this.__value}`
  }

  isInline(): boolean {
    return true
  }

  getFieldKey(): string {
    return this.__key_
  }

  getValue(): string {
    return this.__value
  }

  getValidation(): ValidationResult {
    return this.__validation
  }

  getFieldName(): string | undefined {
    return this.__fieldName
  }

  private getPillClasses(): string {
    let classes =
      'inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-medium pill-animate transition-all hover:scale-105 cursor-pointer'
    switch (this.__validation) {
      case 'valid':
        classes += ' bg-green-500 text-white shadow-sm'
        break
      case 'invalid_key':
        classes += ' bg-red-500 text-white shadow-sm'
        break
      case 'invalid_value':
        classes += ' bg-yellow-500 text-black shadow-sm'
        break
    }
    return classes
  }
}

function convertPillElement(domNode: HTMLElement): DOMConversionOutput | null {
  const key = domNode.getAttribute('data-key')
  const value = domNode.getAttribute('data-value')
  const validation = domNode.getAttribute('data-validation') as ValidationResult
  const fieldName = domNode.getAttribute('data-field-name') || undefined

  if (key && value && validation) {
    const node = $createPillNode({ key, value, validation, fieldName })
    return { node }
  }

  return null
}

export function $createPillNode(payload: PillNodePayload): PillNode {
  return new PillNode(payload)
}

export function $isPillNode(node: LexicalNode | null | undefined): node is PillNode {
  return node instanceof PillNode
}
