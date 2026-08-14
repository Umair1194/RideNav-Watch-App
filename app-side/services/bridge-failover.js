const getBody = response => typeof response.body === 'string' ? JSON.parse(response.body) : response.body

async function fetchStatus(fetcher, url, token, timeoutMs, source) {
  let timer
  try {
    const response = await Promise.race([
      fetcher({ url, method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs) })
    ])
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`)
    const body = getBody(response)
    if (!body || typeof body !== 'object') throw new Error('invalid response')
    return { body, source }
  } finally { if (timer) clearTimeout(timer) }
}

export async function fetchBridgeWithFallback({ fetcher, cloudUrl, localUrl, token, cloudTimeout = 3500, localTimeout = 1200 }) {
  let cloudError
  try { return await fetchStatus(fetcher, cloudUrl, token, cloudTimeout, 'private-relay') } catch (error) { cloudError = error }
  try { return await fetchStatus(fetcher, localUrl, token, localTimeout, 'phone-local') } catch (_) {}
  try { return await fetchStatus(fetcher, cloudUrl, token, cloudTimeout, 'private-relay') } catch (_) {
    throw new Error(String(cloudError?.message || '').includes('HTTP') ? 'Relay rejected request' : 'Relay connection timeout')
  }
}
