import { createContext } from 'react-router'
import type { billingPlans } from '~/db/schema'

export type WorkspacePlan = typeof billingPlans.$inferSelect

export const subscriptionContext = createContext<WorkspacePlan | null>(null)
