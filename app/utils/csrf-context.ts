import { createContext } from 'react-router'

/**
 * React Router context key for the CSRF token string.
 * Set by the root CSRF middleware after generating the token;
 * read by the root loader to pass the token to the client.
 */
export const csrfContext = createContext<string | null>(null)
