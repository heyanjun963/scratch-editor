const createNoopBlockFunction = block => {
    switch (block.blockType) {
    case 'hat':
        return () => true;
    case 'boolean':
        return () => false;
    case 'reporter':
        return () => '';
    case 'command':
    default:
        return () => {};
    }
};

const manifestBlockToExtensionBlock = block => ({
    opcode: block.opcode,
    blockType: block.scratchBlockType,
    text: block.text,
        arguments: Object.keys(block.arguments).reduce((argumentsByName, name) => {
            const argument = block.arguments[name];
            argumentsByName[name] = {
                type: argument.scratchType,
                defaultValue: argument.defaultValue
            };
            if (argument.menu) {
                argumentsByName[name].menu = argument.menu;
            }
            return argumentsByName;
        }, {})
    });

const manifestToExtensionBlocks = manifest => {
    const blocksByOpcode = manifest.blocks.reduce((result, block) => {
        result[block.opcode] = manifestBlockToExtensionBlock(block);
        return result;
    }, {});

    if (!manifest.categories || !manifest.categories.length) {
        return manifest.blocks.map(manifestBlockToExtensionBlock);
    }

    const usedOpcodes = new Set();
    const groupedBlocks = manifest.categories.reduce((result, category) => {
        const categoryBlocks = category.blocks
            .map(opcode => blocksByOpcode[opcode])
            .filter(Boolean);
        if (!categoryBlocks.length) return result;

        if (category.name && !category.hideLabel) {
            result.push({subCategory: category.name});
        }
        categoryBlocks.forEach(block => {
            usedOpcodes.add(block.opcode);
            result.push(block);
        });
        return result;
    }, []);

    const ungroupedBlocks = manifest.blocks
        .filter(block => !usedOpcodes.has(block.opcode))
        .map(manifestBlockToExtensionBlock);

    if (groupedBlocks.length && ungroupedBlocks.length) {
        return groupedBlocks.concat(['---'], ungroupedBlocks);
    }
    return groupedBlocks.concat(ungroupedBlocks);
};

const manifestToExtensionInfo = manifest => ({
    id: manifest.id,
    name: manifest.name,
    blockIconURI: manifest.icon || undefined,
    menuIconURI: manifest.icon || undefined,
    color1: manifest.color1,
    color2: manifest.color2,
    color3: manifest.color3,
    menus: manifest.menus || {},
    blocks: manifestToExtensionBlocks(manifest)
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
