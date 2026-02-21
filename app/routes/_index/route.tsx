import type { Route } from './+types/route'
import { Welcome } from './+welcome'
import { getCloudflare } from '~/utils/cloudflare-context'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New React Router App' },
		{ name: 'description', content: 'Welcome to React Router!' },
	]
}

export function loader({ context }: Route.LoaderArgs) {
	const { env } = getCloudflare(context)
	return { message: `Environment: ${env.ENVIRONMENT}` }
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return <Welcome message={loaderData.message} />
}
