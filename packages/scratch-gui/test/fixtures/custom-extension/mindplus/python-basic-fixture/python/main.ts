//% color="#CF1256" iconWidth=50 iconHeight=40
namespace pythonfixture {
    //% block="print [TEXT] repeat [COUNT] times" blockType="command"
    //% TEXT.shadow="string" TEXT.defl="hello"
    //% COUNT.shadow="number" COUNT.defl=1
    export function printText(parameter: any, block: any) {
        const text = parameter.TEXT.code;
        const count = parameter.COUNT.code;

        // Python fixture 使用官方 Generator 调用，供后续静态转换 imports 和语句模板。
        Generator.addImport("import time");
        Generator.addCode(`for _ in range(${count}):\n\tprint(${text})\n\ttime.sleep(0.05)`);
    }

    //% block="read fixture status [MODE]" blockType="reporter"
    //% MODE.shadow="dropdown" MODE.options="MODE"
    export function readStatus(parameter: any, block: any) {
        const mode = parameter.MODE.code;
        Generator.addImport("from fixture_helper import read_status");
        Generator.addCode(`read_status(${mode})`);
    }

    //% block="fixture status [MODE] is ready" blockType="boolean"
    //% MODE.shadow="dropdownRound" MODE.options="MODE"
    export function isReady(parameter: any, block: any) {
        const mode = parameter.MODE.code;
        Generator.addImport("from fixture_helper import read_status");
        Generator.addCode(`read_status(${mode}) == 1`);
    }
}
