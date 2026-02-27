import type { MDXComponents } from 'mdx/types'

const components: MDXComponents = {
	h1: (props) => <h1 className="text-h2 mb-2" {...props} />,
	h2: (props) => <h2 className="text-h4 mt-10 mb-3" {...props} />,
	p: (props) => (
		<p
			className="text-muted-foreground text-body-sm mb-4 leading-relaxed"
			{...props}
		/>
	),
	strong: (props) => <strong className="text-muted-foreground" {...props} />,
}

export function LegalProse({ children }: { children: React.ReactNode }) {
	return <article>{children}</article>
}

export { components as legalComponents }
