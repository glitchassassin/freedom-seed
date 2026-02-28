import type { MDXComponents } from 'mdx/types'

const components: MDXComponents = {
	h1: (props) => <h1 className="text-h1 mb-4" {...props} />,
	h2: (props) => <h2 className="text-h3 mt-10 mb-3" {...props} />,
	h3: (props) => <h3 className="text-h4 mt-8 mb-2" {...props} />,
	p: (props) => <p className="text-body-md mb-4 leading-relaxed" {...props} />,
	ul: (props) => <ul className="mb-4 list-disc space-y-1 pl-6" {...props} />,
	ol: (props) => <ol className="mb-4 list-decimal space-y-1 pl-6" {...props} />,
	li: (props) => <li className="text-body-md" {...props} />,
	a: (props) => (
		<a className="text-primary underline hover:no-underline" {...props} />
	),
	code: (props) => (
		<code
			className="bg-muted rounded px-1 py-0.5 font-mono text-sm"
			{...props}
		/>
	),
	pre: (props) => (
		<pre
			className="bg-muted mb-4 overflow-x-auto rounded p-4 font-mono text-sm"
			{...props}
		/>
	),
	blockquote: (props) => (
		<blockquote
			className="border-muted mb-4 border-l-4 pl-4 italic"
			{...props}
		/>
	),
}

export function BlogProse({ children }: { children: React.ReactNode }) {
	return <article className="mx-auto max-w-prose">{children}</article>
}

export { components as blogComponents }
