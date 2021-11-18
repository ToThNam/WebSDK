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

var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;
var node = process.execPath;
var nodeDir = path.dirname(process.execPath);
var npm = path.join(nodeDir, 'npm.cmd');
// import { runnerScript } from "../typescript/scripts/runner";
if (!fs.existsSync(npm)) {
    var alternateNpm = path.join(nodeDir, 'npm');

    if (fs.existsSync(alternateNpm)) {
        npm = alternateNpm;
    }
}

console.log('Using node: ' + node);
console.log('Using npm: ' + npm);

function run(command: string, next: () => void) {
    var p = spawn(command[0], command.slice(1), { stdio: 'inherit' });

    p.on('error', function (err: string) {
        console.error('Error received: ', err);
        process.exit(77);
    });

    p.on('close', function (code: number) {
        if (code !== 0) {
            console.error(command[0] + ' failed with code ' + code);
            process.exit(code);
        }

        next();
    });
}

exports.runCommands = function runCommands(commands: any, done: () => void) {
    var command = commands[0];

    if (typeof command === 'string') {
        command = command.split(' ');
    }

    if (command.length > 0) {
        if (command[0] === 'npm') {
            command[0] = npm;
        } else if (command[0] === 'node') {
            command[0] = node;
        }
    }

    run(command, function () {
        if (commands.length > 1) {
            runCommands(commands.slice(1), done);
        } else {
            if (done) {
                done();
            }
        }
    });
};

exports.node = node;
exports.npm = npm;