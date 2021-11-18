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

/* global process module __dirname */
var path = require('path');
var browsers = [];
var isWin = /^win/.test(process.platform);
var isOSX = /^darwin/.test(process.platform);
var CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

browsers.push('ChromeHeadless');
browsers.push('Firefox');

if (isWin) {
    browsers.push('IE');
    browsers.push('Edge');
}

if (isOSX) {
    browsers.push('Safari');
}

module.exports = function(config) {
    config.set({
        // Base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../src',

        // Frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'stacktrace'],

        // List of files / patterns to load in the browser
        files: [
            '../test/test-runner.js'
        ],

        // List of files to exclude
        exclude: [
            'src/main.js'
        ],

        // Preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {'../test/test-runner.js': ['webpack']},

        webpack: {
            mode: 'development',
            optimization: {minimize: false},
            devtool: 'inline-source-map',
            resolve: {alias: {'sdk': path.resolve(__dirname, '../src/sdk')}}, // Resolve test dependencies to src
            plugins: [
                new CaseSensitivePathsPlugin()
            ]
        },

        webpackMiddleware: {
            noInfo: true,
            stats: 'errors-only'
        },

        plugins: [
            require('karma-webpack'),
            require('karma-mocha'),
            require('karma-chrome-launcher'),
            require('karma-edge-launcher'),
            require('karma-firefox-launcher'),
            require('karma-ie-launcher'),
            require('karma-opera-launcher'),
            require('karma-safari-launcher'),
            require('karma-spec-reporter'),
            require('karma-stacktrace')
        ],

        // Test results reporter to use
        // possible values: 'dots', 'progress', 'spec'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['spec'],

        // Web server port
        port: 9875,

        // Enable / disable colors in the output (reporters and logs)
        colors: true,

        // Level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // Enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // Start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: browsers,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true
    });
};