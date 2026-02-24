import { start } from './mocks/resend-server'

export default async function globalSetup() {
	await start()
}
