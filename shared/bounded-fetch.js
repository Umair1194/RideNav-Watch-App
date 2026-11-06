// Zepp's Fetch API does not document cancellation. Retain native operations until
// they settle and bound their count, even after a UI watchdog has timed out.
export function createBoundedFetch(fetcher, limit = 4) {
  let active = 0
  return request => {
    if (active >= limit) return Promise.reject(new Error('Phone network busy; retrying'))
    active += 1
    return Promise.resolve().then(() => fetcher(request)).finally(() => { active -= 1 })
  }
}
