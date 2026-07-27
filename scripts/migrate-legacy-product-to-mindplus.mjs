// 将旧 manifest/blocks/generator 产品源机械转换为 Mind+ Python 作者源，转换后必须再做等价性验证。
import fs from 'fs';
import path from 'path';

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJson = (filePath, value) => {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const quoteDirectiveValue = value => JSON.stringify(String(value));

// Generator 模板只把 {ARG} 转成已绑定参数，其他内容保持原样。
const renderGeneratorTemplate = (template, argumentNames) => {
    let result = String(template || '')
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
    argumentNames.forEach(name => {
        result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), `\${value_${name}}`);
    });
    return `\`${result}\``;
};

const getShadow = argument => {
    if (argument.type === 'number') return 'number';
    if (argument.type === 'boolean') return 'boolean';
    if (argument.menu) return 'dropdown';
    return 'string';
};

const renderArgumentDirective = (name, argument) => {
    const fields = [
        `${name}.shadow=${quoteDirectiveValue(getShadow(argument))}`
    ];
    if (argument.menu) fields.push(`${name}.options=${quoteDirectiveValue(argument.menu)}`);
    fields.push(`${name}.defl=${quoteDirectiveValue(argument.defaultValue)}`);
    return `    //% ${fields.join(' ')}`;
};

const renderGeneratorCall = (method, value, argumentNames) =>
    `        Generator.${method}(${renderGeneratorTemplate(value, argumentNames)});`;

// 每个函数只生成解析器白名单内的参数绑定和 Generator 调用。
const renderBlockFunction = (block, generator) => {
    const argumentNames = Object.keys(block.arguments || {});
    const lines = [
        `    //% block=${quoteDirectiveValue(block.text)} blockType=${quoteDirectiveValue(block.blockType)}`,
        ...argumentNames.map(name => renderArgumentDirective(name, block.arguments[name])),
        `    export function ${block.opcode}(parameter: any, block: any) {`,
        ...argumentNames.map(name => `        const value_${name} = parameter.${name}.code;`),
        ...(generator.imports || []).map(value => renderGeneratorCall('addImport', value, argumentNames)),
        ...(generator.variables || []).map(value =>
            `        Generator.addObject("", "", ${renderGeneratorTemplate(value, argumentNames)});`),
        ...(generator.setups || []).map(value =>
            `        Generator.addSetup("", ${renderGeneratorTemplate(value, argumentNames)});`)
    ];
    if (generator.template) lines.push(renderGeneratorCall('addCode', generator.template, argumentNames));
    lines.push('    }');
    return lines.join('\n');
};

const getBlockOverride = (block, generator) => {
    const override = {};
    ['entryTemplate', 'entryFooter', 'launcher', 'section', 'templateSelector'].forEach(field => {
        if (generator[field]) override[field] = generator[field];
    });
    const specialArguments = Object.entries(block.arguments || {}).reduce((argumentsByName, [name, argument]) => {
        if (!['string', 'number', 'boolean'].includes(argument.type)) {
            argumentsByName[name] = {
                type: argument.type,
                defaultValue: argument.defaultValue
            };
        }
        return argumentsByName;
    }, {});
    if (Object.keys(specialArguments).length) override.arguments = specialArguments;
    return override;
};

const migrateProduct = sourceDirectory => {
    const manifest = readJson(path.join(sourceDirectory, 'manifest.json'));
    const blockSource = readJson(path.join(sourceDirectory, manifest.entry.blocks));
    const generatorSource = readJson(path.join(sourceDirectory, manifest.entry.python));
    const blocksByOpcode = new Map(blockSource.blocks.map(block => [block.opcode, block]));
    const generatorBlocks = generatorSource.blocks || {};
    const missingGenerators = blockSource.blocks.filter(block => !generatorBlocks[block.opcode]);
    if (missingGenerators.length) {
        throw new Error(`以下积木缺少 Python 规则: ${missingGenerators.map(block => block.opcode).join(', ')}`);
    }

    const blockOverrides = blockSource.blocks.reduce((overrides, block) => {
        const override = getBlockOverride(block, generatorBlocks[block.opcode]);
        if (Object.keys(override).length) overrides[block.opcode] = override;
        return overrides;
    }, {});
    const config = {
        name: {'zh-cn': manifest.name, en: manifest.name},
        description: {'zh-cn': manifest.description || '', en: manifest.description || ''},
        author: manifest.author || 'Hiwonder',
        license: manifest.license || 'MIT',
        isBoard: false,
        id: manifest.id,
        platform: ['win', 'mac', 'web', 'linux'],
        version: manifest.version,
        scratchEditor: {
            color1: manifest.color1,
            color2: manifest.color2,
            color3: manifest.color3,
            categories: blockSource.categories || [],
            blocks: blockOverrides
        },
        asset: {
            python: {
                dir: 'python/',
                version: manifest.version,
                main: 'main.ts',
                dependencies: {},
                files: ['_menus/index.json']
            }
        }
    };
    const menus = Object.entries(manifest.menus || {}).reduce((result, [name, menu]) => {
        result[name] = {
            menu: menu.items.map(item => [String(item.text), String(item.value)])
        };
        return result;
    }, {});
    const mainSource = [
        `// ${manifest.name} Mind+ Python 作者源：积木与代码模板由已校对的声明式产品包机械迁移。`,
        `//% color=${quoteDirectiveValue(manifest.color1)} iconWidth=50 iconHeight=40`,
        `namespace ${manifest.id} {`,
        blockSource.blocks.map(block => renderBlockFunction(block, generatorBlocks[block.opcode])).join('\n\n'),
        '}',
        ''
    ].join('\n');

    if (blocksByOpcode.size !== Object.keys(generatorBlocks).length) {
        throw new Error('积木数量与 Python 规则数量不一致，拒绝迁移');
    }
    writeJson(path.join(sourceDirectory, 'config.json'), config);
    writeJson(path.join(sourceDirectory, 'python/_menus/index.json'), menus);
    fs.mkdirSync(path.join(sourceDirectory, 'python'), {recursive: true});
    fs.writeFileSync(path.join(sourceDirectory, 'python/main.ts'), mainSource);
    console.info(`已迁移 ${manifest.id} ${manifest.version}: ${blockSource.blocks.length} 个积木`);
};

const sourceDirectory = process.argv[2];
if (!sourceDirectory) {
    console.error('用法: node scripts/migrate-legacy-product-to-mindplus.mjs <旧产品源目录>');
    process.exitCode = 1;
} else {
    try {
        migrateProduct(path.resolve(sourceDirectory));
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}

export {migrateProduct};
