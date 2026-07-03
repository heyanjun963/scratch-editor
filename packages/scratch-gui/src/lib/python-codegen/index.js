import ScratchVM from '@scratch/scratch-vm';
import {getPythonCodegenTemplate} from '../custom-extension/codegen-registry';

const generatePythonCode = workspace => ScratchVM.generatePythonCode(workspace, {
    getPythonCodegenTemplate
});

export default generatePythonCode;
