const webpackConfig = require('../../webpack.config');

describe('webpack blocks media assets', () => {
    test('copies default block media to themed and legacy paths', () => {
        const copyDestinations = webpackConfig.plugins
            .flatMap(plugin => plugin.patterns || [])
            .filter(pattern => pattern.from && pattern.from.includes('scratch-blocks/media'))
            .map(pattern => pattern.to);

        expect(copyDestinations).toEqual(expect.arrayContaining([
            'static/blocks-media',
            'static/blocks-media/default',
            'static/blocks-media/high-contrast'
        ]));
    });
});
