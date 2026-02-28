/**
 * Vitest global setup file.
 *
 * Suppresses the node:sqlite ExperimentalWarning so it does not pollute test
 * output.  The warning fires once per process when the module is first
 * imported; filtering it here keeps the reporter output clean.
 */
const _emitWarning = process.emitWarning.bind(process)

process.emitWarning = function (warning: any, ...args: any[]): void {
	if (typeof warning === 'string' && warning.includes('SQLite')) return
	return _emitWarning(warning, ...args)
}
