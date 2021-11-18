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

/* global process */
var http = require('http');
var https = require('https');
var express = require('express');
var path = require('path');
var fs = require('fs');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), 'example')));
app.use(express.static(path.join(process.cwd(), 'dist')));
app.use(express.static(path.join(process.cwd(), 'generated')));
app.use(express.static(path.join(process.cwd(), 'src')));
app.use(express.static(path.join(process.cwd(), 'node_modules')));

app.get('/', function(req, res) {
    res.redirect('/GetUserMedia.html');
});

app.post('/log', function(req, res) {
    console.log(req.body);

    res.sendStatus(200);
});

var httpServer = http.createServer(app);

httpServer.listen(8888);

console.log('Listening on port 8888/http');

if (process.env['PHENIX_HTTPS_PFX']) {
    var httpsOptions = {
        pfx: fs.readFileSync(process.env['PHENIX_HTTPS_PFX']),
        passphrase: process.env['PHENIX_HTTPS_PASSPHRASE']
    };
    var httpsServer = https.createServer(httpsOptions, app);

    httpsServer.listen(8843);

    console.log('Listening on port 8843/https');
}