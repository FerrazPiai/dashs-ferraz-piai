/**
 * Composable for Chart.js default configurations
 * Provides reusable chart configs aligned with design system
 */

/**
 * Get default Chart.js options with design system styling
 * @param {object} overrides - Custom options to merge
 * @returns {object} Chart.js options object
 */
export function getChartDefaults(overrides = {}) {
  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#cccccc',
          font: {
            family: "'Ubuntu', 'Segoe UI', sans-serif",
            size: 12
          },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: '#141414',
        titleColor: '#ffffff',
        bodyColor: '#cccccc',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        titleFont: {
          family: "'Ubuntu', 'Segoe UI', sans-serif",
          size: 13,
          weight: 600
        },
        bodyFont: {
          family: "'Ubuntu', 'Segoe UI', sans-serif",
          size: 12
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          drawBorder: false
        },
        ticks: {
          color: '#666666',
          font: {
            family: "'Ubuntu', 'Segoe UI', sans-serif",
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          drawBorder: false
        },
        ticks: {
          color: '#666666',
          font: {
            family: "'Ubuntu', 'Segoe UI', sans-serif",
            size: 11
          }
        }
      }
    }
  }

  return mergeDeep(defaults, overrides)
}

/**
 * Get default colors palette for charts
 * @returns {Array<string>} Array of color hex codes
 */
export function getChartColors() {
  return [
    '#22c55e', // Verde
    '#f97316', // Laranja
    '#fbbf24', // Amarelo
    '#ff0000', // Vermelho
    '#a855f7', // Roxo
    '#84cc16', // Verde-limão
    '#ec4899', // Rosa
    '#999999'  // Cinza
  ]
}

/**
 * Get semantic colors for status-based charts
 * @returns {object} Object with semantic color mappings
 */
export function getSemanticColors() {
  return {
    safe: '#22c55e',
    care: '#fbbf24',
    danger: '#ef4444',
    info: '#3b82f6',
    primary: '#ff0000',
    neutral: '#999999'
  }
}

/**
 * Create gradient for Chart.js
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} color - Base color hex
 * @param {number} height - Canvas height
 * @returns {CanvasGradient} Gradient object
 */
export function createGradient(ctx, color, height = 400) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, `${color}88`) // 53% opacity
  gradient.addColorStop(1, `${color}00`) // 0% opacity
  return gradient
}

/**
 * Deep merge objects (for merging chart options)
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function mergeDeep(target, source) {
  const output = { ...target }

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key]
        } else {
          output[key] = mergeDeep(target[key], source[key])
        }
      } else {
        output[key] = source[key]
      }
    })
  }

  return output
}

/**
 * Check if value is an object
 * @param {*} item - Value to check
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

// Export all utilities as default
export default {
  getChartDefaults,
  getChartColors,
  getSemanticColors,
  createGradient
}
