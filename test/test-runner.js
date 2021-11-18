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

// Webpack syntax - recursively loads all dependencies
var tests = require.context('./sdk/', true, /When[^].*\.js$/i);
var components = require.context('../src/sdk/', true, /.*\.js$/i);

define([
    'lodash',
    'chai',
    'sinon',
    'sinon-chai'
], function(_, chai, sinon, sinonChai) {
    'use strict';

    var documentCreateElementShim = document.createElement;
    document.createElement = function(type) {
        if (type === 'video') {
            return {
                canPlayType: function() {
                }
            };
        }

        return documentCreateElementShim.call(document, type);
    };

    tests.keys().forEach(tests);
    components.keys().forEach(components);

    chai.use(sinonChai);
    chai.should();

    window.expect = chai.expect;
    window.sinon = sinon;
});