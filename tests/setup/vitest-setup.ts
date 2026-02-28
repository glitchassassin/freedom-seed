/**
 * Vitest global setup file.
 *
 * Suppresses the node:sqlite ExperimentalWarning so it does not pollute test
 * output.  The warning fires once per process when the module is first
 * imported; filtering it here keeps the reporter output clean.
 */
const _emitWarning = process.emitWarning.bind(process)

process.emitWarning = function (warning: any, ...args: any[]): void {
	// Suppress only the node:sqlite ExperimentalWarning; pass everything else through.
	if (
		typeof warning === 'string' &&
		warning.includes('SQLite') &&
		args[0] === 'ExperimentalWarning'
	)
		return
	return _emitWarning(warning, ...args)
}
