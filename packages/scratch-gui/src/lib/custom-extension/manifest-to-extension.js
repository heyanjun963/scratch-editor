const createNoopBlockFunction = block => {
    switch (block.blockType) {
    case 'boolean':
        return () => false;
    case 'reporter':
        return () => '';
    case 'command':
    default:
        return () => {};
    }
};

const manifestToExtensionInfo = manifest => ({
    id: manifest.id,
    name: manifest.name,
    blockIconURI: manifest.icon || undefined,
    menuIconURI: manifest.icon || undefined,
    color1: manifest.color1,
    color2: manifest.color2,
    color3: manifest.color3,
    blocks: manifest.blocks.map(block => ({
        opcode: block.opcode,
        blockType: block.scratchBlockType,
        text: block.text,
        arguments: Object.keys(block.arguments).reduce((argumentsByName, name) => {
            const argument = block.arguments[name];
            argumentsByName[name] = {
                type: argument.scratchType,
                defaultValue: argument.defaultValue
            };
            return argumentsByName;
        }, {})
    }))
});

const manifestToExtensionObject = manifest => {
    const extensionObject = {
        getInfo: () => manifestToExtensionInfo(manifest)
    };
    manifest.blocks.forEach(block => {
        extensionObject[block.opcode] = createNoopBlockFunction(block);
    });
    return extensionObject;
};

export {
    manifestToExtensionInfo,
    manifestToExtensionObject
};
