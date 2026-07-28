const templatesByBlockType = new Map();

// Scratch block type 由 extensionId_opcode 组成，必须和 VM 注册后的 block.type 保持一致。
const getBlockType = (extensionId, opcode) => `${extensionId}_${opcode}`;

// 注册 manifest 的 Python 模板，GUI 侧代码生成会按 block.type 反查这里。
const registerPythonCodegenManifest = manifest => {
    manifest.blocks.forEach(block => {
        templatesByBlockType.set(getBlockType(manifest.id, block.opcode), {
            extensionId: manifest.id,
            opcode: block.opcode,
            blockType: block.blockType,
            arguments: block.arguments,
            template: block.codegen.python.template,
            templateSelector: block.codegen.python.templateSelector || null,
            imports: block.codegen.python.imports || [],
            runtimeFiles: block.codegen.python.runtimeFiles || [],
            variables: block.codegen.python.variables || [],
            forcedVariables: block.codegen.python.forcedVariables || [],
            setups: block.codegen.python.setups || [],
            entryTemplate: block.codegen.python.entryTemplate || '',
            entryFooter: block.codegen.python.entryFooter || '',
            launcher: block.codegen.python.launcher || '',
            section: block.codegen.python.section || ''
        });
    });
};

// 卸载拓展时同步清掉模板，避免旧产品的积木模板继续参与代码生成。
const unregisterPythonCodegenManifest = manifest => {
    manifest.blocks.forEach(block => {
        templatesByBlockType.delete(getBlockType(manifest.id, block.opcode));
    });
};

// 提供给 Python codegen 的查询入口，返回值只描述生成规则，不执行积木逻辑。
const getPythonCodegenTemplate = blockType => templatesByBlockType.get(blockType);

export {
    getPythonCodegenTemplate,
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
};
