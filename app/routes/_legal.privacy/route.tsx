import PrivacyContent from 'content/legal/privacy-policy.md'
import type { Route } from './+types/route'
import { LegalProse, legalComponents } from '~/components/legal-prose'
import { seoMeta } from '~/utils/seo'

export function loader({ request }: Route.LoaderArgs) {
	return { origin: new URL(request.url).origin }
}

export function meta({ data }: Route.MetaArgs) {
	const origin = data?.origin ?? ''
	return seoMeta({
		title: 'Privacy Policy — Seed Vault',
		description: 'Privacy Policy for Seed Vault.',
		url: `${origin}/privacy`,
	})
}

// TODO: Replace all [bracketed] placeholder text in content/legal/privacy-policy.md
// with real values before launch. See docs/facets/legal.md for details.
export default function PrivacyPolicy() {
	return (
		<LegalProse>
			<PrivacyContent components={legalComponents} />
		</LegalProse>
	)
}
