export function formatTime(utcIsoString) {
  const now = new Date()
  const then = new Date(utcIsoString)
  const diff = now - then // ms difference
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hrs = Math.floor(min / 60)
  const days = Math.floor(hrs / 24)

  if (sec < 60) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  // older than a week → show “Mar 3” or “Mar 3, 2024”
  const opts = { month: 'short', day: 'numeric' }
  if (then.getFullYear() !== now.getFullYear()) {
    opts.year = 'numeric'
  }
  return then.toLocaleDateString(undefined, opts)
}

export function getAvatarSrc(src) {
  return !src ? 'default.png' : `/uploads/${src}`
}

export function getPostSrc(src) {
  return src
}

export function formatCounts(n) {
  if (n >= 1e9) {
    return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  }
  if (n >= 1e6) {
    return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (n >= 1e3) {
    return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return String(n)
}

export function formatFileSize(sizeInByte) {
  /**
   * Formats a size in bytes into a human-readable string (e.g., KB, MB, GB).
   * @param {number} sizeInByte The size in bytes.
   * @returns {string} A formatted string representing the size.
   */
  if (sizeInByte === null || sizeInByte === undefined) {
    return 'N/A'
  }

  const units = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  if (sizeInByte === 0) {
    return '0 bytes'
  }

  const i = Math.floor(Math.log(sizeInByte) / Math.log(1024))
  const formattedSize = sizeInByte / Math.pow(1024, i)

  if (i === 0) {
    return `${formattedSize} ${units[i]}`
  }

  const formattedWithPrecision = formattedSize.toFixed(2)
  const formattedWithoutTrailingZeros = parseFloat(formattedWithPrecision).toString()

  return `${formattedWithoutTrailingZeros} ${units[i]}`
}
