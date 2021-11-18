/**
 * Copyright 2020 Phenix Real Time Solutions, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global __dirname module */
const path = require('path');
const del = require('del');
const {merge} = require('webpack-merge');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const {DuplicatesPlugin} = require('inspectpack/plugin');
const assert = require('phenix-web-assert/dist/phenix-web-assert.min');
const assertNames = '^' + Object.keys(assert.__proto__).join('$|^') + '$';
const uglifyManglePropRegex = new RegExp('^_[^_].*' + '|^global$|' + assertNames);
const outputPath = path.join(__dirname, 'dist');

del.sync([path.resolve(outputPath, '**/*')]);

const config = {
    mode: 'production',
    target: 'web',
    entry: {'phenix-web-sdk': path.join(__dirname, 'src', 'web-sdk.js')},
    output: {
        library: 'phenix-web-sdk',
        libraryTarget: 'umd',
        umdNamedDefine: true,
        path: outputPath,
        filename: '[name].js'
    },
    plugins: [
        new CaseSensitivePathsPlugin(),
        new DuplicatesPlugin({
            // Emit compilation warning or error? (Default: `false`)
            emitErrors: true,
            // Display full duplicates information? (Default: `false`)
            verbose: false
        })],
    devtool: 'source-map',
    performance: {hints: false},
    optimization: {minimize: false}
};
const externalizePhenixImports = (context, request, callback) => {
    if (/^phenix-.*$/.test(request)){
        return callback(null, true);
    }

    // Continue without externalizing the import
    callback();
};

const noEdgeConfig = merge(config, {
    output: {filename: config.output.filename.replace('.js', '-no-edge.js')},
    resolve: {alias: {'webrtc-adapter': path.resolve(__dirname, 'node_modules', 'webrtc-adapter/out/adapter_no_edge_no_global.js')}}
});
const externalizedConfig = merge(config, {
    output: {filename: '[name]-externalized.js'},
    externals: [externalizePhenixImports, 'webrtc-adapter']
});
const reactNativeConfig = merge(config, {
    entry: path.join(__dirname, 'src', 'react-native-sdk.js'),
    output: {filename: 'phenix-web-sdk-react-native.js'},
    resolve: {alias: {'phenix-rtc': path.resolve(__dirname, 'node_modules', 'phenix-rtc/dist/phenix-rtc-react-native')}}
});
const nodeConfig = merge(config, {
    target: 'node',
    entry: path.join(__dirname, 'src', 'node-sdk.js'),
    output: {filename: 'phenix-node-sdk.js'},
    resolve: {alias: {'webrtc-adapter': path.resolve(__dirname, 'node_modules', 'webrtc-adapter/out/adapter_no_edge_no_global.js')}}
});
const noPublishConfig = merge(config, {
    output: {filename: config.output.filename.replace('.js', '-no-publish.js')},
    resolve: {
        alias: {
            './userMedia/UserMediaProvider': path.resolve(__dirname, 'src/dummy'),
            './sdk/userMedia/UserMediaResolver': path.resolve(__dirname, 'src/dummy'),
            '../userMedia/UserMediaResolver': path.resolve(__dirname, 'src/dummy'),
            './sdk/bandwidth/BandwidthMonitor': path.resolve(__dirname, 'src/dummy'),
            './userMedia/ScreenShareExtensionManager': path.resolve(__dirname, 'src/dummy'),
            './sdk/audio/AudioSpeakerDetector': path.resolve(__dirname, 'src/dummy')
        }
    }
});
const minifiedConfigs = [config, noEdgeConfig, externalizedConfig, noPublishConfig].map(function(config) {
    return merge(config, {
        output: {filename: config.output.filename.replace('.js', '.min.js')},
        optimization: {
            minimize: true,
            minimizer: [
                new UglifyJsPlugin({
                    uglifyOptions: {
                        mangle: {properties: {regex: uglifyManglePropRegex}},
                        output: {beautify: false},
                        compress: {passes: 2}
                    }
                })
            ]
        }
    });
});

module.exports = [config, noEdgeConfig, externalizedConfig, reactNativeConfig, nodeConfig, noPublishConfig].concat(minifiedConfigs);