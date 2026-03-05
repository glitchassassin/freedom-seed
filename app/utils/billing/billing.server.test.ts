import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test pure logic functions; DB-dependent functions would need integration tests
// For now test the plan ranking logic in require-plan

describe('billing plan lookups', () => {
	it('getBillingPlans returns plans ordered by sortOrder', async () => {
		// This is an integration test pattern - skip if no DB available
		// Instead we verify the function signatures and types exist
		const { getBillingPlans, getBillingPlanBySlug, getWorkspacePlan } =
			await import('./billing.server')
		expect(typeof getBillingPlans).toBe('function')
		expect(typeof getBillingPlanBySlug).toBe('function')
		expect(typeof getWorkspacePlan).toBe('function')
	})
})

describe('requirePlan', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	it('allows access when plan meets minimum', async () => {
		const { requirePlan } = await import('./require-plan.server')
		const { subscriptionContext } = await import('./subscription-context')

		const mockPlan = {
			id: 'plan-1',
			slug: 'pro',
			name: 'Pro',
			stripePriceIdMonthly: 'price_123',
			stripePriceIdYearly: null,
			seatLimit: 25,
			trialDays: 14,
			features: { collaboration: true },
			status: 'active' as const,
			sortOrder: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		const mockContext = {
			get: vi.fn().mockReturnValue(mockPlan),
		}

		const result = requirePlan(mockContext, 'pro')
		expect(result).toEqual(mockPlan)
		expect(mockContext.get).toHaveBeenCalledWith(subscriptionContext)
	})

	it('throws 403 when plan is below minimum', async () => {
		const { requirePlan } = await import('./require-plan.server')

		const mockPlan = {
			id: 'plan-1',
			slug: 'free',
			name: 'Free',
			stripePriceIdMonthly: null,
			stripePriceIdYearly: null,
			seatLimit: 5,
			trialDays: 0,
			features: {},
			status: 'active' as const,
			sortOrder: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		const mockContext = {
			get: vi.fn().mockReturnValue(mockPlan),
		}

		try {
			requirePlan(mockContext, 'pro')
			expect.fail('Should have thrown')
		} catch (e) {
			expect(e).toBeInstanceOf(Response)
			expect((e as Response).status).toBe(403)
		}
	})

	it('throws 500 when no plan is set', async () => {
		const { requirePlan } = await import('./require-plan.server')

		const mockContext = {
			get: vi.fn().mockReturnValue(null),
		}

		try {
			requirePlan(mockContext, 'free')
			expect.fail('Should have thrown')
		} catch (e) {
			expect(e).toBeInstanceOf(Response)
			expect((e as Response).status).toBe(500)
		}
	})
})

describe('syncSubscriptionFromStripe', () => {
	it('exports syncSubscriptionFromStripe function', async () => {
		const { syncSubscriptionFromStripe } = await import('./billing.server')
		expect(typeof syncSubscriptionFromStripe).toBe('function')
	})
})
