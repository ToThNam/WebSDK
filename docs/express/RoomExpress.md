# Room Express

Single-step configuration based API for setting up a room or channel.

```js
var roomExpress = new sdk.express.RoomExpress(expressOptions); // See Below (1)
```

`(1)` See [Express Options](./README.md#express-options)

## View a Channel

Join a channel (room) and automatically view the most recent content published to that channel.

```js
roomExpress.joinChannel(options, function joinChannelCallback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status === 'room-not-found') {
        // Handle room not found - Create a Channel Or Publish to a Channel
    } else if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully joined channel
    if (response.status === 'ok' && response.roomService) {
        // Do something with roomService
    }
}, function subscriberCallback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status === 'no-stream-playing') {
        // Handle no stream playing in channel - Wait for one to start
    } else if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully subscribed to most recent channel presenter
    if (response.status === 'ok' && response.mediaStream) {
        // Do something with mediaStream
    }
});
```

### View Channel Options

```js
var joinChannelOptions = {
    capabilities: ['real-time'],
    // The list of all capabilities to publish with

    alias: 'MyChannelAlias',
    // Alias of the channel to view

    roomId: 'MyChannelId',
    // Optional: Alternative to alias - Id of the channel to view

    videoElement: videoElement,
    // Optional: pass in html5 video element to view channel media
}
```

## Publish to a Channel

Publish to a local or remote media to a channel. Users that are [viewing the channel](#view-a-channel) will see your media.

```js
roomExpress.publishToChannel(options, function callback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully published to channel
    if (response.status === 'ok' && response.publisher) {
        // Do something with publisher
    }
});
```

### Publish to Channel Options

```js
var publishToChannelOptions = {
    capabilities: ['real-time'],
    // The list of all capabilities to publish with

    room: roomOptions, // See Below (1)
    // Room options, if room does not exist it will be created with the given options

    streamUri: 'https://LinkToMyMedia.extension',
    // Link to remote media (mp4, rtmp, etc.)

    userMediaStream: userMediaStream,
    // Optional: alternative to streamUri - pass in user media stream returned from getUserMedia

    frameRate: {
        // Optional frame rate constraints - only applies to remote media

        max: 30,
        exact: 30
    }
}
```

`(1)` See [Create Channel Options](#create-channel-options)

## Create a Channel

```js
roomExpress.createChannel(options, function callback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status === 'already-exists') {
        // Channel already exists
        // Do something with roomService
    } else if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully created channel
    if (response.status === 'ok' && response.roomService) {
        // Do something with roomService
    }
});
```

### Create Channel Options

```js
var createChannelOptions = {
    room: {
        // Create channel options, if room does not exist it will be created with the given options

        name: 'My Channel Name',
        // Required

        alias: 'MyChannelAlias',
        // Optional - If not passed in, alias will generated for you

        description: 'Description of Channel'
        // Optional
    },
}
```