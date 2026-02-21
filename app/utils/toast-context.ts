import { createContext } from 'react-router'
import type { Toast } from './toast.server'

/**
 * React Router context key for the flash toast notification.
 * Set by the root middleware after reading the `en_toast` cookie;
 * read by the root loader to pass toast data to the client.
 */
export const toastContext = createContext<Toast | null>(null)
