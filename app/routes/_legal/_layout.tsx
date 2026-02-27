import { Link, Outlet } from 'react-router'

export default function LegalLayout() {
	return (
		<div className="bg-background text-foreground min-h-screen">
			<header className="mx-auto max-w-3xl px-6 pt-8">
				<Link
					to="/"
					className="text-muted-foreground hover:text-foreground text-body-sm inline-flex items-center gap-1"
				>
					&larr; Back to home
				</Link>
			</header>
			<main className="mx-auto max-w-3xl px-6 py-12">
				<Outlet />
			</main>
			<footer className="border-border border-t py-8">
				<p className="text-muted-foreground text-body-xs text-center">
					Built with Freedom Seed
				</p>
			</footer>
		</div>
	)
}
