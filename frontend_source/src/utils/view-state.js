export function resolveAsyncViewState({
    isLoading = false,
    error = '',
    hasContent = false,
    isEmpty = false
} = {}) {
    const message = typeof error === 'string' ? error.trim() : ''

    if (message && !hasContent) {
        return { status: 'error', message, blocking: true }
    }

    if (isLoading && !hasContent) {
        return { status: 'loading', message: '', blocking: true }
    }

    if (isEmpty) {
        return { status: 'empty', message: '', blocking: false }
    }

    return { status: 'ready', message, blocking: false }
}

export function toUserFacingError(error, fallback = '操作失败，请稍后重试') {
    if (typeof error === 'string' && error.trim()) return error.trim()
    if (error?.message && String(error.message).trim()) return String(error.message).trim()
    return fallback
}
