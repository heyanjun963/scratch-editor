class PythonCodegenContext {
    constructor (options = {}) {
        this.getPythonCodegenTemplate = options.getPythonCodegenTemplate || (() => null);
        this.imports = new Set();
        this.variables = new Set();
        this.functions = new Set();
        this.setups = new Set();
        this.launcher = '';
    }

    addImport (tagOrCode, code) {
        const importLine = code || tagOrCode;
        if (importLine) this.imports.add(importLine);
    }

    addVariable (tagOrCode, code) {
        const variableLine = code || tagOrCode;
        if (variableLine) this.variables.add(variableLine);
    }

    addFunction (tagOrCode, code) {
        const functionLine = code || tagOrCode;
        if (functionLine) this.functions.add(functionLine);
    }

    addSetup (tagOrCode, code) {
        const setupLine = code || tagOrCode;
        if (setupLine) this.setups.add(setupLine);
    }

    setLauncher (launcher) {
        if (launcher) this.launcher = launcher;
    }

    getTemplate (blockType) {
        return this.getPythonCodegenTemplate(blockType);
    }

    getAssignmentName (line) {
        const match = String(line || '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        return match ? match[1] : null;
    }

    getGlobalNames () {
        return Array.from(this.variables)
            .map(line => this.getAssignmentName(line))
            .filter(Boolean)
            .sort();
    }

    getEntryName (index) {
        return index === 0 ? 'start_main' : `start_main${index}`;
    }

    renderLauncher (entryName) {
        if (!this.launcher) return `${entryName}()`;
        return String(this.launcher)
            .replace(/\{MAIN\}/g, entryName)
            .replace(/\bstart_main\b/g, entryName);
    }

    getImportLines () {
        return Array.from(this.imports).sort().map(name => (
            /^(?:from|import)\s/.test(name) ? name : `import ${name}`
        ));
    }

    hasPreamble () {
        return Boolean(
            this.imports.size ||
            this.variables.size ||
            this.functions.size ||
            this.setups.size
        );
    }

    finish (sections) {
        const importLines = this.getImportLines();
        const variableLines = Array.from(this.variables);
        const functionLines = Array.from(this.functions);
        const setupLines = Array.from(this.setups);
        return [
            ...importLines,
            ...(importLines.length ? [''] : []),
            ...(variableLines.length ? ['# initialize variables', ...variableLines, ''] : []),
            ...(functionLines.length ? ['# define functions', ...functionLines, ''] : []),
            ...(setupLines.length ? [...setupLines, ''] : []),
            ...sections.flatMap((section, index) => (index === 0 ? section : ['', ...section]))
        ].join('\n');
    }
}

module.exports = PythonCodegenContext;
