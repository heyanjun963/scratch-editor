// PythonCodegenContext 收集跨积木栈共享的 import、变量、函数、setup 和启动器。
class PythonCodegenContext {
    constructor (options = {}) {
        this.getPythonCodegenTemplate = options.getPythonCodegenTemplate || (() => null);
        this.imports = new Set();
        this.variables = new Set();
        this.functions = new Set();
        this.setups = new Set();
        this.launcher = '';
    }

    // 兼容 addImport(tag, code) 和 addImport(code) 两种调用形态。
    addImport (tagOrCode, code) {
        const importLine = code || tagOrCode;
        if (importLine) this.imports.add(importLine);
    }

    // 变量初始化集中放到文件头，供主函数和事件回调通过 global 引用。
    addVariable (tagOrCode, code) {
        const variableLine = code || tagOrCode;
        if (variableLine) this.variables.add(variableLine);
    }

    // 预留给后续产品库声明辅助函数，目前主要由模板驱动扩展使用。
    addFunction (tagOrCode, code) {
        const functionLine = code || tagOrCode;
        if (functionLine) this.functions.add(functionLine);
    }

    // setup 是主函数外的顶层代码，例如旧版“当启动时”对应的初始化语句。
    addSetup (tagOrCode, code) {
        const setupLine = code || tagOrCode;
        if (setupLine) this.setups.add(setupLine);
    }

    // launcher 控制主函数如何启动，例如 Hiwonder.startMain(start_main)。
    setLauncher (launcher) {
        if (launcher) this.launcher = launcher;
    }

    // 通过 GUI 注册进来的模板查询函数获取自定义积木生成规则。
    getTemplate (blockType) {
        return this.getPythonCodegenTemplate(blockType);
    }

    // 从变量初始化语句中提取变量名，用于生成函数体 global 声明。
    getAssignmentName (line) {
        const match = String(line || '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        return match ? match[1] : null;
    }

    // 全局名排序保证多次生成代码的输出稳定，方便对比和测试。
    getGlobalNames () {
        return Array.from(this.variables)
            .map(line => this.getAssignmentName(line))
            .filter(Boolean)
            .sort();
    }

    // 多个主入口按旧版生成 start_main/start_main1/start_main2。
    getEntryName (index) {
        return index === 0 ? 'start_main' : `start_main${index}`;
    }

    // launcher 模板支持 {MAIN}，同时兼容旧写法中的 start_main 字面量。
    renderLauncher (entryName) {
        if (!this.launcher) return `${entryName}()`;
        return String(this.launcher)
            .replace(/\{MAIN\}/g, entryName)
            .replace(/\bstart_main\b/g, entryName);
    }

    // manifest 可写 random 或 import random，这里统一输出合法 import 行。
    getImportLines () {
        return Array.from(this.imports).sort().map(name => (
            /^(?:from|import)\s/.test(name) ? name : `import ${name}`
        ));
    }

    // 只有 setup/import/变量等前置信息时，也应该生成一份非空 Python 文件。
    hasPreamble () {
        return Boolean(
            this.imports.size ||
            this.variables.size ||
            this.functions.size ||
            this.setups.size
        );
    }

    // 最终拼装顺序对齐旧版：imports -> variables -> functions -> setup -> entry sections。
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
