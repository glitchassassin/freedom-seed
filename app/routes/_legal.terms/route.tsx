import { seoMeta } from '~/utils/seo'

export function meta() {
	return seoMeta({
		title: 'Terms of Service — Seed Vault',
		description: 'Terms of Service for Seed Vault.',
	})
}

// TODO: Replace all [bracketed] placeholder text with real values before launch.
// See docs/facets/legal.md for details.
export default function TermsOfService() {
	return (
		<article>
			<h1 className="text-h2 mb-2">Terms of Service</h1>
			<p className="text-muted-foreground text-body-sm mb-8">
				Effective date: [Date]
			</p>

			<h2 className="text-h4 mt-10 mb-3">Acceptance of Terms</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				By accessing or using [Seed Vault], you agree to be bound by these Terms
				of Service and our Privacy Policy. If you do not agree to these terms,
				please do not use the service. [Company Name] reserves the right to
				update these terms at any time, with notice provided as described below.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Description of Service</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				[Seed Vault] is a collaborative seed cataloging application that allows
				users to record, organize, and share information about seed collections.
				[Company Name] provides the service on an &ldquo;as is&rdquo; basis and
				may modify, suspend, or discontinue features at any time. We will make
				reasonable efforts to notify users of significant changes to the
				service.
			</p>

			<h2 className="text-h4 mt-10 mb-3">User Accounts</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				You must create an account to access most features of [Seed Vault], and
				you are responsible for maintaining the confidentiality of your
				credentials. You agree to provide accurate information when registering
				and to keep your account details up to date. You may not share your
				account with others or create accounts on behalf of third parties
				without authorization.
			</p>

			<h2 className="text-h4 mt-10 mb-3">User Content</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				You retain ownership of all content you submit to [Seed Vault],
				including seed entries, photos, and descriptions. By submitting content,
				you grant [Company Name] a non-exclusive, worldwide license to store,
				display, and transmit that content solely to provide the service. You
				are responsible for ensuring you have the right to submit any content
				you upload.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Acceptable Use</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				You agree not to use [Seed Vault] for any unlawful purpose or in any way
				that could harm, disable, or impair the service or other users.
				Prohibited activities include uploading malicious code, attempting to
				gain unauthorized access to other accounts, and using the service to
				distribute spam or illegal content. [Company Name] may suspend or
				terminate accounts that violate these guidelines.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Intellectual Property</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				[Seed Vault] and its underlying software, design, and trademarks are
				owned by [Company Name] and protected by applicable intellectual
				property laws. You may not copy, modify, distribute, or create
				derivative works from any part of the service without our prior written
				consent. User-submitted content remains the property of the respective
				users as described in the User Content section.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Termination</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				[Company Name] may suspend or terminate your access to [Seed Vault] at
				any time for violation of these Terms or for any other reason at our
				sole discretion. You may delete your account at any time through the
				account settings or by contacting us. Upon termination, your right to
				use the service ceases and we may delete your data in accordance with
				our Privacy Policy.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Disclaimers</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				[Seed Vault] is provided &ldquo;as is&rdquo; without warranties of any
				kind, express or implied, including warranties of merchantability,
				fitness for a particular purpose, or non-infringement. [Company Name]
				does not warrant that the service will be uninterrupted, error-free, or
				free of harmful components. You use the service at your own risk.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Limitation of Liability</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				To the maximum extent permitted by law, [Company Name] shall not be
				liable for any indirect, incidental, special, consequential, or punitive
				damages arising from your use of [Seed Vault]. Our total liability to
				you for any claims arising under these Terms shall not exceed the amount
				you paid us in the twelve months preceding the claim, or $100 if you
				have not made any payments. Some jurisdictions do not allow limitation
				of liability, so these limitations may not apply to you.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Changes to Terms</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				We may update these Terms of Service periodically, and we will post the
				revised terms on this page with an updated effective date. For
				significant changes, we will provide notice via email or a prominent
				in-app notification at least 14 days before the changes take effect.
				Continued use of [Seed Vault] after changes become effective constitutes
				your acceptance of the revised Terms.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Governing Law</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				These Terms of Service shall be governed by and construed in accordance
				with the laws of [Jurisdiction], without regard to its conflict of law
				provisions. Any disputes arising under these Terms shall be subject to
				the exclusive jurisdiction of the courts located in [Jurisdiction]. If
				any provision of these Terms is found to be unenforceable, the remaining
				provisions will continue in full force.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Contact</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				If you have questions about these Terms of Service, please contact
				[Company Name] at [contact email]. We welcome feedback and are committed
				to addressing any concerns promptly. You may also write to us at
				[Company Address].
			</p>
		</article>
	)
}
