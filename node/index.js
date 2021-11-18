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

var sdk = require('phenix-web-sdk/dist/phenix-node-sdk');
var adminApiProxyClient = new sdk.net.AdminApiProxyClient();

adminApiProxyClient.setBackendUri('https://demo.phenixrts.com/pcast');

var channelExpress = new sdk.express.ChannelExpress({adminApiProxyClient: adminApiProxyClient});
var streamUri = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
var capabilities = ['fhd'];
var channelAlias = 'channelNodeExample'; // https://phenixrts.com/channel/?m=r#channelNodeExample

channelExpress.publishToChannel({
    streamUri: streamUri,
    capabilities: capabilities,
    screenName: 'Node Publisher',
    channel: {
        alias: channelAlias,
        name: channelAlias
    }
}, function publishCallback(error, response) {
    if (error) {
        console.error(error);

        return;
    }

    if (response.status !== 'ok') {
        console.warn(response.status);

        return;
    }

    console.log('Success', response.publisher.getStreamId());
});