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

	console.log('\nDone! All users have password: Password1!')
}

main().catch((err) => {
	console.error('Seed failed:', err)
	process.exit(1)
})
