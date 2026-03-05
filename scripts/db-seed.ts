#!/usr/bin/env node
/**
 * Seeds the local D1 database with sample users, workspaces, and invitations.
 *
 * Usage:
 *   npm run db:seed
 *
 * Prerequisites:
 *   The preview server must have run at least once to create the D1 file:
 *   npm run build && wrangler d1 migrations apply freedom-seed --local
 */
// eslint-disable-next-line no-restricted-imports -- seed script reuses test factories
import {
	createUser,
	createWorkspace,
	createWorkspaceMember,
	createInvitation,
	createBillingPlan,
} from '../tests/factories/index'

async function main() {
	console.log('Seeding database…\n')

	const alice = await createUser({
		email: 'alice@example.com',
		password: 'Password1!',
		displayName: 'Alice',
	})
	console.log(`  ✓ User: ${alice.user.email} (${alice.user.id})`)

	const bob = await createUser({
		email: 'bob@example.com',
		password: 'Password1!',
		displayName: 'Bob',
	})
	console.log(`  ✓ User: ${bob.user.email} (${bob.user.id})`)

	const carol = await createUser({
		email: 'carol@example.com',
		password: 'Password1!',
		displayName: 'Carol',
	})
	console.log(`  ✓ User: ${carol.user.email} (${carol.user.id})`)

	const acme = createWorkspace({
		ownerId: alice.user.id,
		name: 'Acme Corp',
		slug: 'acme-corp',
	})
	console.log(`  ✓ Workspace: ${acme.workspace.name} (${acme.workspace.slug})`)

	createWorkspaceMember({
		workspaceId: acme.workspace.id,
		userId: bob.user.id,
		role: 'admin',
	})
	console.log(`  ✓ Member: bob → Acme Corp (admin)`)

	createWorkspaceMember({
		workspaceId: acme.workspace.id,
		userId: carol.user.id,
		role: 'member',
	})
	console.log(`  ✓ Member: carol → Acme Corp (member)`)

	createInvitation({
		workspaceId: acme.workspace.id,
		invitedByUserId: alice.user.id,
		email: 'dave@example.com',
	})
	console.log(`  ✓ Invitation: dave@example.com → Acme Corp`)

	const freePlan = createBillingPlan({
		slug: 'free',
		name: 'Free',
		seatLimit: 5,
		features: {
			seedCatalog: true,
			photoUploads: true,
			collaboration: false,
			prioritySupport: false,
		},
		sortOrder: 0,
	})
	console.log(`  ✓ Billing Plan: ${freePlan.name} (${freePlan.slug})`)

	const proPlan = createBillingPlan({
		slug: 'pro',
		name: 'Pro',
		stripePriceIdMonthly: 'price_pro_monthly_placeholder',
		stripePriceIdYearly: 'price_pro_yearly_placeholder',
		seatLimit: 25,
		trialDays: 14,
		features: {
			seedCatalog: true,
			photoUploads: true,
			collaboration: true,
			prioritySupport: false,
		},
		sortOrder: 1,
	})
	console.log(`  ✓ Billing Plan: ${proPlan.name} (${proPlan.slug})`)

	const enterprisePlan = createBillingPlan({
		slug: 'enterprise',
		name: 'Enterprise',
		stripePriceIdMonthly: 'price_enterprise_monthly_placeholder',
		stripePriceIdYearly: 'price_enterprise_yearly_placeholder',
		seatLimit: 0,
		features: {
			seedCatalog: true,
			photoUploads: true,
			collaboration: true,
			prioritySupport: true,
		},
		sortOrder: 2,
	})
	console.log(
		`  ✓ Billing Plan: ${enterprisePlan.name} (${enterprisePlan.slug})`,
	)

	console.log('\nDone! All users have password: Password1!')
}

main().catch((err) => {
	console.error('Seed failed:', err)
	process.exit(1)
})
