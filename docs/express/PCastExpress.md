# PCast Express

Single-step configuration based API for publishing and subscribing.

```js
var pcastExpress = new sdk.express.PCastExpress(expressOptions); // See Below (1)
```

`(1)` See [Express Options](./README.md#express-options)

## Publishing Local Media

```js
pcastExpress.publish(options, function callback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully published
    if (response.status === 'ok' && response.publisher) {
        // Do something with publisher
    }
});
```

+ Parameters
    + options: (object, required) - Publish options
    + callback: (function, required) - Callback for error/success handling

### Publish Options

```js
var publishOptions = {
    capabilities: ['real-time'],
    // The list of all capabilities to publish with

    mediaConstraints: {
        // User media to publish

        audio: true,
        video: true
    },

    userMediaStream: userMediaStream,
    // Optional: alternative to mediaConstraints - pass in user media stream returned from getUserMedia

    videoElement: videoElement,
    // Optional: pass in html5 video element to attach media stream to

    monitor: monitorOptions, // See Below (1)
    // Optional: Monitor a publisher for failure.

    connectOptions: [],
    // Optional: list of options for publishing from a remote source

    tags: [],
    // Optional: stream tags
}
```

`(1)` See [Monitor Options](./Monitor.md#monitor-options)

## Publishing Remote Media

```js
pcastExpress.publishRemote(options, function callback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully published
    if (response.status === 'ok' && response.publisher) {
        // Do something with publisher
    }
});
```

+ Parameters
    + options: (object, required) - Publish options
    + callback: (function, required) - Callback for error/success handling


### Publish Remote Options

```js
var publishRemoteOptions = {
    capabilities: ['real-time'],
    // The list of all capabilities to publish with

    streamUri: 'https://LinkToMyMedia.extension',
    // Link to remote media (mp4, rtmp, etc.)

    connectOptions: [],
    // Optional: list of options for publishing from a remote source

    tags: [],
    // Optional: stream tags

    monitor: monitorOptions, // See Below (1)
    // Optional: Monitor a publisher for failure.

    frameRate: {
        // Optional frame rate constraints

        max: 30,
        exact: 30
    }
}
```

## Subscribing to Published Media

```js
pcastExpress.subscribe(options, function callback(error, response) {
    if (error) {
        // Handle error
    }

    if (response.status !== 'ok') {
        // Handle error
    }

    // Successfully subscribed
    if (response.status === 'ok' && response.publisher) {
        // Do something with mediaStream
    }
});
```

+ Parameters
    + options: (object, required) - Publish options
    + callback: (function, required) - Callback for error/success handling


### Subscribe Options

```js
var subscribeOptions = {
    capabilities: ['real-time'],
    // The list of all capabilities to publish with

    videoElement: videoElement,
    // Optional: pass in html5 video element to view media

    monitor: monitorOptions, // See Below (1)
    // Optional: Monitor a subscriber for failure.

    connectOptions: [],
    // Optional: list of options for publishing from a remote source

    tags: [],
    // Optional: stream tags
}
```

 `(1)` See [Monitor Options](./Monitor.md#monitor-options)