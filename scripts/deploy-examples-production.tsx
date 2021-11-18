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

runner.runCommands([
    ['gsutil', '-h', 'Cache-Control:public, max-age=60, stale-while-revalidate=604800, stale-if-error=259200, s-maxage=60, proxy-revalidate', '-m', 'cp', '-R', 'example/*', 'gs://phenix-assets-us/examples'],
    ['gsutil', '-h', 'Cache-Control:public, max-age=60, stale-while-revalidate=604800, stale-if-error=259200, s-maxage=60, proxy-revalidate', '-m', 'cp', '-R', 'src/*', 'gs://phenix-assets-us/examples'],
    ['gsutil', '-h', 'Cache-Control:public, max-age=60, stale-while-revalidate=604800, stale-if-error=259200, s-maxage=60, proxy-revalidate', '-m', 'cp', '-R', 'dist/*', 'gs://phenix-assets-us/examples'],
    ['gsutil', '-h', 'Cache-Control:public, max-age=60, stale-while-revalidate=604800, stale-if-error=259200, s-maxage=60, proxy-revalidate', '-m', 'cp', '-R', 'node_modules/phenix-*', 'node_modules/jquery', 'node_modules/lodash', 'node_modules/bootstrap', 'node_modules/bootstrap-notify', 'node_modules/fingerprintjs2', 'node_modules/shaka-player', 'node_modules/requirejs', 'node_modules/animate.css', 'node_modules/webrtc-adapter', 'gs://phenix-assets-us/examples']
]);