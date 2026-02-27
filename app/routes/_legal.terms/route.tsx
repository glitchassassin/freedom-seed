import TermsContent from 'content/legal/terms-of-service.md'
import type { Route } from './+types/route'
import { LegalProse, legalComponents } from '~/components/legal-prose'
import { seoMeta } from '~/utils/seo'

export function loader({ request }: Route.LoaderArgs) {
	return { origin: new URL(request.url).origin }
}

export function meta({ data }: Route.MetaArgs) {
	const origin = data?.origin ?? ''
	return seoMeta({
		title: 'Terms of Service — Seed Vault',
		description: 'Terms of Service for Seed Vault.',
		url: `${origin}/terms`,
	})
}

// TODO: Replace all [bracketed] placeholder text in content/legal/terms-of-service.md
// with real values before launch. See docs/facets/legal.md for details.
export default function TermsOfService() {
	return (
		<LegalProse>
			<TermsContent components={legalComponents} />
		</LegalProse>
	)
}
