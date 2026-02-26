/**
 * Backward-compatible re-exports from the factory system.
 *
 * New code should import from `./factories` directly.
 * @deprecated Use `./factories` instead.
 */
export {
	getUserIdByEmail,
	seedPasswordResetToken,
	seedMagicLinkToken,
	seedExpiredMagicLinkToken,
	markMagicLinkTokenUsed,
} from './factories'
