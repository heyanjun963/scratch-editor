import ScratchVM from '@scratch/scratch-vm';
import {getPythonCodegenTemplate} from '../custom-extension/codegen-registry';

// GUI 侧桥接函数：把 workspace 交给 scratch-vm，并注入当前已加载拓展库的模板查询能力。
const generatePythonCode = workspace => ScratchVM.generatePythonCode(workspace, {
    getPythonCodegenTemplate
});

export default generatePythonCode;
