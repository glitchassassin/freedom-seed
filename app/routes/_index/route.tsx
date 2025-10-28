import type { Route } from './+types/route'
import { Welcome } from './welcome'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New React Router App' },
		{ name: 'description', content: 'Welcome to React Router!' },
	]
}

export function loader({ context }: Route.LoaderArgs) {
	return { message: `Environment: ${context.cloudflare.env.ENVIRONMENT}` }
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return <Welcome message={loaderData.message} />
}
