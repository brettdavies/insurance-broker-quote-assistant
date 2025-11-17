/**
 * Shared formatting utilities
 *
 * Centralized formatting functions used across report generation.
 * Follows STAR principle (Single Truth, Authoritative Record).
 */

/**
 * Format status emoji for display
 */
export function formatStatus(passed: boolean): string {
  return passed ? '✅ PASSED' : '❌ FAILED'
}

/**
 * Format percentage value with one decimal place
 * Standardized to use .toFixed(1) for consistency across all reports
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Format currency with 4 decimal places
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`
}

/**
 * Format product display value
 */
export function formatProduct(product: string | string[] | undefined): string {
  if (!product) return 'N/A'
  return Array.isArray(product) ? product.join(', ') : product
}

/**
 * Format flow type for display
 */
export function formatFlowType(flowType: 'conversational' | 'policy'): string {
  return flowType === 'conversational' ? 'Conversational' : 'Policy'
}

/**
 * Format table rows from a record of data
 *
 * @param data - Record of data to format
 * @param formatter - Function to format each row
 * @returns Markdown table rows joined with newlines
 */
export function formatTableRows<T>(
  data: Record<string, T>,
  formatter: (key: string, value: T) => string
): string {
  const rows = Object.entries(data).map(([key, value]) => formatter(key, value))
  return rows.length > 0 ? rows.join('\n') : ''
}
