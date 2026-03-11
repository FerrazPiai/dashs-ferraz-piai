/**
 * Composable for data formatting utilities
 * Common formatters for numbers, dates, percentages, etc.
 */

/**
 * Format number as percentage
 * @param {number} value - Value to format (0-1 or 0-100)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {boolean} isDecimal - True if value is 0-1, false if 0-100 (default: true)
 * @returns {string} Formatted percentage (e.g., "45.60%")
 */
export function formatPercentage(value, decimals = 2, isDecimal = true) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  const percent = isDecimal ? value * 100 : value
  return `${percent.toFixed(decimals)}%`
}

/**
 * Format ISO date string to Brazilian format
 * @param {string} isoString - ISO date string
 * @param {boolean} includeTime - Include time in output (default: true)
 * @returns {string} Formatted date (e.g., "24/02/2026 18:07")
 */
export function formatDateTime(isoString, includeTime = true) {
  if (!isoString) return '-'

  try {
    const date = new Date(isoString)

    if (isNaN(date.getTime())) {
      return isoString
    }

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    const dateStr = `${day}/${month}/${year}`

    if (!includeTime) {
      return dateStr
    }

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${dateStr} ${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return isoString
  }
}

/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number (e.g., "1.234" or "1.234,56")
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Format currency in BRL
 * @param {number} value - Value to format
 * @returns {string} Formatted currency (e.g., "R$ 1.234,56")
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) {
    return text
  }

  return `${text.substring(0, maxLength)}...`
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  if (!bytes) return '-'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Format relative time (e.g., "2 horas atrás")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '-'

  const now = new Date()
  const then = new Date(date)
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'agora mesmo'
  if (diffMin < 60) return `${diffMin} minuto${diffMin > 1 ? 's' : ''} atrás`
  if (diffHour < 24) return `${diffHour} hora${diffHour > 1 ? 's' : ''} atrás`
  if (diffDay < 7) return `${diffDay} dia${diffDay > 1 ? 's' : ''} atrás`

  return formatDateTime(date, false)
}

/**
 * Format currency in abbreviated BRL (e.g., R$ 25,1k / R$ 13,1M)
 * @param {number} value - Value to format
 * @returns {string} Abbreviated currency string
 */
export function formatCurrencyAbbrev(value) {
  if (value === null || value === undefined || isNaN(value)) return '-'
  const abs = Math.abs(value)
  const prefix = value < 0 ? '-' : ''
  function abbrev(n) {
    return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace('.', ',')
  }
  if (abs >= 1_000_000) return `${prefix}R$ ${abbrev(abs / 1_000_000)}M`
  if (abs >= 1_000)     return `${prefix}R$ ${abbrev(abs / 1_000)}k`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Export all formatters as default
export default {
  formatPercentage,
  formatDateTime,
  formatNumber,
  formatCurrency,
  truncate,
  formatBytes,
  formatRelativeTime,
  formatCurrencyAbbrev
}
