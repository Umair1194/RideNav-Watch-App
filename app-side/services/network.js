import { createBoundedFetch } from '../../shared/bounded-fetch.js'
export const phoneFetch = createBoundedFetch(request => fetch(request))
