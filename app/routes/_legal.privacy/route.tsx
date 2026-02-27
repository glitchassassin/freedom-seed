import { seoMeta } from '~/utils/seo'

export function meta() {
	return seoMeta({
		title: 'Privacy Policy — Seed Vault',
		description: 'Privacy Policy for Seed Vault.',
	})
}

// TODO: Replace all [bracketed] placeholder text with real values before launch.
// See docs/facets/legal.md for details.
export default function PrivacyPolicy() {
	return (
		<article>
			<h1 className="text-h2 mb-2">Privacy Policy</h1>
			<p className="text-muted-foreground text-body-sm mb-8">
				Effective date: [Date]
			</p>

			<h2 className="text-h4 mt-10 mb-3">Introduction</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				[Company Name] operates [Seed Vault], a collaborative seed cataloging
				application. This Privacy Policy explains how we collect, use, and
				protect your personal information when you use our service. By using
				[Seed Vault], you agree to the collection and use of information in
				accordance with this policy.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Information We Collect</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				We collect information you provide directly, including your email
				address and password when you create an account, as well as any seed
				catalog entries, photos, and workspace details you add. We also collect
				usage data such as pages visited, features used, and interaction
				timestamps to improve the service. Uploaded content including photos and
				seed descriptions is stored on our servers and associated with your
				account.
			</p>

			<h2 className="text-h4 mt-10 mb-3">How We Use Your Information</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				We use your account information to authenticate you, send transactional
				emails (such as email verification and password resets), and provide the
				core seed cataloging features. Usage data is used to monitor service
				health, troubleshoot issues, and understand how people use [Seed Vault]
				so we can improve it. We do not use your data for advertising or sell it
				to third parties.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Information Sharing</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				We do not sell, rent, or trade your personal information to third
				parties. We may share data with service providers who help us operate
				[Seed Vault] (such as cloud infrastructure and email delivery), bound by
				confidentiality agreements. We may disclose information if required by
				law or to protect the rights and safety of [Company Name] and its users.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Data Security</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				We implement industry-standard security measures including encrypted
				connections (HTTPS), hashed passwords, and access controls to protect
				your data. No method of transmission over the internet is 100% secure,
				and we cannot guarantee absolute security. We will notify affected users
				promptly in the event of a data breach.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Your Rights</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				You have the right to access, correct, or delete your personal
				information at any time by contacting us or using the account settings
				in [Seed Vault]. You may request a copy of the data we hold about you in
				a portable format. To delete your account and associated data, contact
				us at [contact email].
			</p>

			<h2 className="text-h4 mt-10 mb-3">Children&apos;s Privacy</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				[Seed Vault] is not directed at children under 13 years of age, and we
				do not knowingly collect personal information from children under 13. If
				we discover that a child under 13 has provided us with personal
				information, we will promptly delete it. Parents or guardians who
				believe their child has submitted personal information should contact us
				immediately.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Changes to This Policy</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				We may update this Privacy Policy from time to time to reflect changes
				in our practices or for legal, operational, or regulatory reasons. We
				will notify you of significant changes by posting the new policy on this
				page with an updated effective date. Continued use of [Seed Vault] after
				changes become effective constitutes your acceptance of the revised
				policy.
			</p>

			<h2 className="text-h4 mt-10 mb-3">Contact Us</h2>
			<p className="text-muted-foreground text-body-sm mb-4 leading-relaxed">
				If you have questions or concerns about this Privacy Policy or our data
				practices, please contact [Company Name] at [contact email]. We aim to
				respond to all inquiries within 5 business days. You may also write to
				us at [Company Address].
			</p>
		</article>
	)
}
