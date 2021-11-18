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

var runner = require('./runner');
var packageJson = require('../package.json');
var version = packageJson.version;

runner.runCommands([
    'node --version',
    'npm --version',
    version.match(/beta/g) ? 'npm publish --tag beta' : 'npm publish',
    'scp -r dist/ repo@repository.phenixrts.com:dist/WebSDK/' + version,
    'git tag -am "v' + version + '" v' + version,
    'git push --tags'
]);