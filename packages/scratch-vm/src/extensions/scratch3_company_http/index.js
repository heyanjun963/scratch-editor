const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const log = require('../../util/log');
const {fetchWithTimeout} = require('../../util/fetch-with-timeout');
const formatMessage = require('format-message');

/**
 * Icon to be displayed in the blocks category menu and on extension blocks.
 * @type {string}
 */
const iconURI = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<rect width="40" height="40" rx="8" fill="#0FBD8C"/>' +
    '<path d="M10 15h20M10 20h16M10 25h20" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M28 9l4 4-4 4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" ' +
    'stroke-linejoin="round"/>' +
    '</svg>'
);

/**
 * How long to wait in ms before timing out HTTP requests.
 * @type {number}
 */
const requestTimeoutMs = 10000;
const deepSeekRequestTimeoutMs = 30000;
const deepSeekBaseURL = 'https://api.deepseek.com';
const deepSeekEnvironmentKeyToken = 'process.env.DEEPSEEK_API_KEY';
const deepSeekDefaultModel = 'deepseek-v4-pro';
const deepSeekModels = [
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'deepseek-chat',
    'deepseek-reasoner'
];

const getDefaultDeepSeekApiKey = () => {
    if (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY) {
        return process.env.DEEPSEEK_API_KEY;
    }
    return '';
};

/**
 * Example extension for learning how Scratch extension blocks are defined and executed.
 */
class Scratch3CompanyHttpBlocks {
    constructor (runtime) {
        /**
         * The Scratch VM runtime.
         * @type {Runtime}
         * @private
         */
        this._runtime = runtime;

        /**
         * Response body from the most recent request.
         * @type {string}
         * @private
         */
        this._lastResponseBody = '';

        /**
         * API key used when calling DeepSeek.
         * @type {string}
         * @private
         */
        this._deepSeekApiKey = getDefaultDeepSeekApiKey();

        /**
         * DeepSeek model name used for chat completions.
         * @type {string}
         * @private
         */
        this._deepSeekModel = deepSeekDefaultModel;

        /**
         * Answer from the most recent DeepSeek request.
         * @type {string}
         * @private
         */
        this._lastDeepSeekAnswer = '';
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'companyHttp',
            name: formatMessage({
                id: 'companyHttp.categoryName',
                default: 'Company HTTP',
                description: 'Name of the Company HTTP extension'
            }),
            blockIconURI: iconURI,
            menuIconURI: iconURI,
            color1: '#0FBD8C',
            color2: '#0DA57A',
            color3: '#0B8E69',
            blocks: [
                {
                    opcode: 'fetchAndLog',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'companyHttp.fetchAndLog',
                        default: 'GET [URL] log and say response',
                        description: 'Command block that requests a URL, logs the response body, and says it'
                    }),
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://api.github.com/zen'
                        }
                    }
                },
                {
                    opcode: 'fetchText',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'companyHttp.fetchText',
                        default: 'GET text [URL]',
                        description: 'Reporter block that requests a URL and returns response text'
                    }),
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://api.github.com/zen'
                        }
                    }
                },
                {
                    opcode: 'lastResponseBody',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'companyHttp.lastResponseBody',
                        default: 'last response body',
                        description: 'Reporter block that returns the most recent HTTP response body'
                    })
                },
                '---',
                {
                    opcode: 'setDeepSeekApiKey',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'companyHttp.setDeepSeekApiKey',
                        default: 'set DeepSeek API key [KEY]',
                        description: 'Command block that stores the DeepSeek API key'
                    }),
                    arguments: {
                        KEY: {
                            type: ArgumentType.STRING,
                            defaultValue: deepSeekEnvironmentKeyToken
                        }
                    }
                },
                {
                    opcode: 'setDeepSeekModel',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'companyHttp.setDeepSeekModel',
                        default: 'set DeepSeek model [MODEL]',
                        description: 'Command block that stores the DeepSeek model name'
                    }),
                    arguments: {
                        MODEL: {
                            type: ArgumentType.STRING,
                            menu: 'deepSeekModels',
                            defaultValue: deepSeekDefaultModel
                        }
                    }
                },
                {
                    opcode: 'askDeepSeekAndSay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'companyHttp.askDeepSeekAndSay',
                        default: 'ask DeepSeek [PROMPT] and say answer',
                        description: 'Command block that asks DeepSeek and says the answer'
                    }),
                    arguments: {
                        PROMPT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Say hello in one short sentence.'
                        }
                    }
                },
                {
                    opcode: 'askDeepSeek',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'companyHttp.askDeepSeek',
                        default: 'ask DeepSeek [PROMPT]',
                        description: 'Reporter block that asks DeepSeek and returns the answer'
                    }),
                    arguments: {
                        PROMPT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Say hello in one short sentence.'
                        }
                    }
                },
                {
                    opcode: 'lastDeepSeekAnswer',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'companyHttp.lastDeepSeekAnswer',
                        default: 'last DeepSeek answer',
                        description: 'Reporter block that returns the most recent DeepSeek answer'
                    })
                }
            ],
            menus: {
                deepSeekModels: {
                    acceptReporters: true,
                    items: deepSeekModels
                }
            }
        };
    }

    /**
     * Request a URL and return the response body as text.
     * @param {string} urlValue URL argument from a Scratch block.
     * @returns {Promise<string>} Response body, or a readable error message.
     * @private
     */
    _fetchText (urlValue) {
        const url = Cast.toString(urlValue).trim();

        if (!url) {
            this._lastResponseBody = '';
            return Promise.resolve('');
        }

        return fetchWithTimeout(url, {method: 'GET'}, requestTimeoutMs)
            .then(response => response.text())
            .then(body => {
                this._lastResponseBody = body;
                return body;
            })
            .catch(error => {
                const message = `HTTP request failed: ${error.message || error}`;
                this._lastResponseBody = message;
                log.warn(`[Company HTTP] ${message}`);
                return message;
            });
    }

    /**
     * GET a URL, print the response body, and show it in a say bubble.
     * @param {object} args Block arguments.
     * @param {BlockUtility} util Utility object for the running block.
     * @returns {Promise<void>} Promise resolved when the request has completed.
     */
    fetchAndLog (args, util) {
        return this._fetchText(args.URL).then(body => {
            log.info(`[Company HTTP] response body: ${body}`);
            // eslint-disable-next-line no-console
            console.log('[Company HTTP] response body:', body);
            if (this._runtime && util && util.target) {
                this._runtime.emit('SAY', util.target, 'say', body);
            }
        });
    }

    /**
     * GET a URL and return the response body.
     * @param {object} args Block arguments.
     * @returns {Promise<string>} Response body.
     */
    fetchText (args) {
        return this._fetchText(args.URL);
    }

    /**
     * Return the response body from the most recent request.
     * @returns {string} Response body.
     */
    lastResponseBody () {
        return this._lastResponseBody;
    }

    /**
     * Store a DeepSeek API key for future request blocks.
     * @param {object} args Block arguments.
     */
    setDeepSeekApiKey (args) {
        const key = Cast.toString(args.KEY).trim();
        this._deepSeekApiKey = key === deepSeekEnvironmentKeyToken ? getDefaultDeepSeekApiKey() : key;
    }

    /**
     * Store a DeepSeek model name for future request blocks.
     * @param {object} args Block arguments.
     */
    setDeepSeekModel (args) {
        const model = Cast.toString(args.MODEL).trim();
        this._deepSeekModel = model || deepSeekDefaultModel;
    }

    /**
     * Call DeepSeek's OpenAI-compatible chat completions API.
     * @param {string} promptValue User prompt from a Scratch block.
     * @returns {Promise<string>} DeepSeek answer, or a readable error message.
     * @private
     */
    _askDeepSeek (promptValue) {
        const prompt = Cast.toString(promptValue).trim();
        const apiKey = this._deepSeekApiKey || getDefaultDeepSeekApiKey();

        if (!apiKey) {
            return Promise.resolve(this._setLastDeepSeekAnswer(
                'DeepSeek API key is not set. Use the set DeepSeek API key block first.'
            ));
        }

        if (!prompt) {
            return Promise.resolve(this._setLastDeepSeekAnswer(''));
        }

        const body = {
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: this._deepSeekModel || deepSeekDefaultModel,
            thinking: {
                type: 'enabled'
            },
            reasoning_effort: 'high',
            stream: false
        };

        return fetchWithTimeout(`${deepSeekBaseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }, deepSeekRequestTimeoutMs)
            .then(response => response.text().then(responseText => {
                if (!response.ok) {
                    return this._setLastDeepSeekAnswer(`DeepSeek HTTP ${response.status}: ${responseText}`);
                }

                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (error) {
                    return this._setLastDeepSeekAnswer(responseText);
                }

                const answer = data &&
                    data.choices &&
                    data.choices[0] &&
                    data.choices[0].message &&
                    data.choices[0].message.content;
                return this._setLastDeepSeekAnswer(answer || responseText);
            }))
            .catch(error => this._setLastDeepSeekAnswer(`DeepSeek request failed: ${error.message || error}`));
    }

    /**
     * Store the latest DeepSeek answer.
     * @param {string} answer DeepSeek answer or error message.
     * @returns {string} The stored answer.
     * @private
     */
    _setLastDeepSeekAnswer (answer) {
        this._lastDeepSeekAnswer = answer;
        return answer;
    }

    /**
     * Ask DeepSeek and show the answer in a say bubble.
     * @param {object} args Block arguments.
     * @param {BlockUtility} util Utility object for the running block.
     * @returns {Promise<void>} Promise resolved when the request has completed.
     */
    askDeepSeekAndSay (args, util) {
        return this._askDeepSeek(args.PROMPT).then(answer => {
            log.info(`[Company HTTP] DeepSeek answer: ${answer}`);
            // eslint-disable-next-line no-console
            console.log('[Company HTTP] DeepSeek answer:', answer);
            if (this._runtime && util && util.target) {
                this._runtime.emit('SAY', util.target, 'say', answer);
            }
        });
    }

    /**
     * Ask DeepSeek and return the answer.
     * @param {object} args Block arguments.
     * @returns {Promise<string>} DeepSeek answer.
     */
    askDeepSeek (args) {
        return this._askDeepSeek(args.PROMPT);
    }

    /**
     * Return the answer from the most recent DeepSeek request.
     * @returns {string} DeepSeek answer.
     */
    lastDeepSeekAnswer () {
        return this._lastDeepSeekAnswer;
    }
}

module.exports = Scratch3CompanyHttpBlocks;
