import { createContext } from 'react-router'

/**
 * React Router context key for the per-request unique identifier.
 * Set in the Worker fetch handler; available in all middleware, loaders, and actions.
 */
export const requestIdContext = createContext<string>('')
