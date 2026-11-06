const getBody = response => typeof response.body === 'string' ? JSON.parse(response.body) : response.body

async function fetchStatus(fetcher, url, token, timeoutMs, source) {
  let timer
  try {
    const response = await Promise.race([
      fetcher({ url, method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs) })
    ])
    if (response.status < 200 || response.status >= 300) {
      const error = new Error(`HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    const body = getBody(response)
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.active !== 'boolean') throw new Error('Invalid bridge response')
    return { body, source }
  } finally { if (timer) clearTimeout(timer) }
}

export async function fetchBridgeWithFallback({ fetcher, cloudUrl, localUrl, token, cloudTimeout = 3500, localTimeout = 1200 }) {
  let cloudError
  const usable = result => result.body.bridgeOnline !== false && !result.body.stale
  let offline
  try { const result = await fetchStatus(fetcher, cloudUrl, token, cloudTimeout, 'private-relay'); if (usable(result)) return result; offline = result } catch (error) { cloudError = error }
  try { const result = await fetchStatus(fetcher, localUrl, token, localTimeout, 'phone-local'); if (usable(result)) return result; offline ||= result } catch (_) {}
  if (offline) return offline
  try { return await fetchStatus(fetcher, cloudUrl, token, cloudTimeout, 'private-relay') } catch (error) {
    const status = error.status || cloudError?.status
    throw new Error(status === 401 || status === 403 ? 'Relay authentication rejected' : status ? 'Relay service unavailable' : 'Relay connection timeout')
  }
}
