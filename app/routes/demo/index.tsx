import type { ReactNode } from 'react'
import { useState } from 'react'
import { Form } from 'react-router'
import type { Route } from './+types/index'
import { CsrfInput } from '~/components/csrf-input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Icon } from '~/components/ui/icon'
import { iconNames } from '~/components/ui/icons/icon-name'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { Textarea } from '~/components/ui/textarea'
import { showToast } from '~/utils/toast.server'

const toastTypes = ['success', 'error', 'warning', 'info'] as const

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const type = formData.get('type')
	if (!toastTypes.includes(type as (typeof toastTypes)[number])) {
		return showToast({ type: 'error', title: 'Invalid toast type' }, '/demo')
	}
	const labels: Record<string, string> = {
		success: 'Changes saved successfully',
		error: 'Something went wrong',
		warning: 'Your session is about to expire',
		info: 'A new version is available',
	}
	const descriptions: Record<string, string> = {
		success: 'Your profile has been updated.',
		error: 'Please try again or contact support.',
		warning: 'You will be logged out in 5 minutes.',
		info: 'Refresh the page to get the latest features.',
	}
	return showToast(
		{
			type: type as (typeof toastTypes)[number],
			title: labels[type as string],
			description: descriptions[type as string],
		},
		'/demo#toasts',
	)
}

export function meta() {
	return [{ title: 'Component Demo' }, { name: 'robots', content: 'noindex' }]
}

const iconSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'font'] as const

const buttonVariants = [
	'default',
	'secondary',
	'outline',
	'destructive',
	'ghost',
	'link',
] as const

const badgeVariants = [
	'default',
	'secondary',
	'destructive',
	'outline',
] as const

const tableRows = [
	{ name: 'Alice', role: 'Admin', status: 'Active' },
	{ name: 'Bob', role: 'Member', status: 'Inactive' },
	{ name: 'Carol', role: 'Viewer', status: 'Active' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="space-y-4">
			<h2 className="text-foreground border-b pb-2 text-lg font-semibold">
				{title}
			</h2>
			{children}
		</section>
	)
}

export default function DemoRoute() {
	const [checkboxChecked, setCheckboxChecked] = useState(false)
	const [dropdownRadio, setDropdownRadio] = useState('member')
	const [dropdownCheck, setDropdownCheck] = useState(true)

	return (
		<main className="mx-auto max-w-3xl space-y-12 px-4 py-12">
			<h1 className="text-3xl font-bold">Component Demo</h1>

			{/* Icons */}
			<Section title="Icons">
				<div className="space-y-4">
					{iconNames.map((name) => (
						<div key={name} className="space-y-1">
							<p className="text-muted-foreground font-mono text-xs">{name}</p>
							<div className="flex flex-wrap items-end gap-4">
								{iconSizes.map((size) => (
									<div key={size} className="flex flex-col items-center gap-1">
										<Icon name={name} size={size} />
										<span className="text-muted-foreground text-xs">
											{size}
										</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
				<div className="space-y-2">
					<p className="text-muted-foreground text-sm">Icon with label</p>
					<div className="flex flex-wrap gap-4">
						<Icon name="lucide--check" size="sm">
							Confirmed
						</Icon>
						<Icon name="lucide--x" size="sm">
							Dismissed
						</Icon>
						<Icon name="lucide--chevron-right" size="sm">
							Continue
						</Icon>
					</div>
				</div>
			</Section>

			{/* Buttons */}
			<Section title="Buttons">
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-3">
						{buttonVariants.map((variant) => (
							<Button key={variant} variant={variant}>
								{variant}
							</Button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button size="sm">Small</Button>
						<Button size="default">Default</Button>
						<Button size="lg">Large</Button>
						<Button size="wide">Wide</Button>
						<Button size="pill">Pill</Button>
						<Button size="icon" aria-label="Close">
							<Icon name="lucide--x" size="sm" />
						</Button>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button disabled>Disabled</Button>
						<Button variant="outline">
							<Icon name="lucide--check" size="sm" />
							With icon
						</Button>
					</div>
				</div>
			</Section>

			{/* Badges */}
			<Section title="Badges">
				<div className="flex flex-wrap gap-3">
					{badgeVariants.map((variant) => (
						<Badge key={variant} variant={variant}>
							{variant}
						</Badge>
					))}
				</div>
			</Section>

			{/* Form Controls */}
			<Section title="Form Controls">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="demo-input">Input</Label>
						<Input id="demo-input" placeholder="Type something…" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="demo-input-invalid">Input (invalid)</Label>
						<Input
							id="demo-input-invalid"
							placeholder="Invalid value"
							aria-invalid="true"
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="demo-textarea">Textarea</Label>
						<Textarea
							id="demo-textarea"
							placeholder="Write a longer message…"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="demo-checkbox"
							checked={checkboxChecked}
							onCheckedChange={(v) => setCheckboxChecked(Boolean(v))}
						/>
						<Label htmlFor="demo-checkbox">
							{checkboxChecked ? 'Checked' : 'Unchecked'}
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox id="demo-checkbox-disabled" disabled />
						<Label htmlFor="demo-checkbox-disabled" className="opacity-50">
							Disabled
						</Label>
					</div>
				</div>
			</Section>

			{/* Dialog */}
			<Section title="Dialog">
				<Dialog>
					<DialogTrigger asChild>
						<Button variant="outline">Open Dialog</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Confirm action</DialogTitle>
							<DialogDescription>
								This is a modal dialog built with Radix UI. It traps focus and
								supports keyboard navigation.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogTrigger asChild>
								<Button variant="outline">Cancel</Button>
							</DialogTrigger>
							<Button>Confirm</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</Section>

			{/* Dropdown Menu */}
			<Section title="Dropdown Menu">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline">
							Open Menu
							<Icon
								name="lucide--chevron-right"
								size="sm"
								className="ml-1 rotate-90"
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56">
						<DropdownMenuLabel>My Account</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								Profile
								<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
							</DropdownMenuItem>
							<DropdownMenuItem>
								Settings
								<DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuCheckboxItem
							checked={dropdownCheck}
							onCheckedChange={setDropdownCheck}
						>
							Show notifications
						</DropdownMenuCheckboxItem>
						<DropdownMenuSeparator />
						<DropdownMenuRadioGroup
							value={dropdownRadio}
							onValueChange={setDropdownRadio}
						>
							<DropdownMenuLabel inset>Role</DropdownMenuLabel>
							<DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="member">
								Member
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem>Export data</DropdownMenuItem>
								<DropdownMenuItem disabled>Delete account</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-destructive">
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</Section>

			{/* Table */}
			<Section title="Table">
				<Table>
					<TableCaption>A list of team members.</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tableRows.map((row) => (
							<TableRow key={row.name}>
								<TableCell className="font-medium">{row.name}</TableCell>
								<TableCell>{row.role}</TableCell>
								<TableCell>
									<Badge
										variant={row.status === 'Active' ? 'default' : 'secondary'}
									>
										{row.status}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell colSpan={2}>Total</TableCell>
							<TableCell>{tableRows.length} members</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			</Section>

			{/* Toasts */}
			<Section title="Toasts">
				<p className="text-muted-foreground text-sm">
					Toast notifications are triggered by Route actions via a flash cookie.
					Each button below submits a form, sets a cookie, and redirects back —
					the toast appears on the next render.
				</p>
				<div id="toasts" className="flex flex-wrap gap-3">
					{toastTypes.map((type) => (
						<Form key={type} method="POST">
							<CsrfInput />
							<input type="hidden" name="type" value={type} />
							<Button type="submit" variant="outline" className="capitalize">
								{type}
							</Button>
						</Form>
					))}
				</div>
			</Section>
		</main>
	)
}
