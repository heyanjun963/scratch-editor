const templatesByBlockType = new Map();

const getBlockType = (extensionId, opcode) => `${extensionId}_${opcode}`;

const registerPythonCodegenManifest = manifest => {
    manifest.blocks.forEach(block => {
        templatesByBlockType.set(getBlockType(manifest.id, block.opcode), {
            extensionId: manifest.id,
            opcode: block.opcode,
            blockType: block.blockType,
            arguments: block.arguments,
            template: block.codegen.python.template,
            imports: block.codegen.python.imports || []
        });
    });
};

const unregisterPythonCodegenManifest = manifest => {
    manifest.blocks.forEach(block => {
        templatesByBlockType.delete(getBlockType(manifest.id, block.opcode));
    });
};

const getPythonCodegenTemplate = blockType => templatesByBlockType.get(blockType);

export {
    getPythonCodegenTemplate,
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
};
