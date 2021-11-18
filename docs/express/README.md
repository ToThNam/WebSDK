# Express API

Simple configuration based APIs for setting up your streaming application.

## Express Options

Pass these options when creating an instance of the [PCast Express](./PCastExpress.md) or [Room Express](./RoomExpress.md).

```js
var expressOptions = {
    backendUri: '//hostname/restapi',
    // Url to your backend. We query this to authenticate and get streaming tokens.

    authenticationData: {}
    // Your authentication data for the user.
}
```

## Configuring Your Backend

You must setup your own backend REST API in order to secure your streaming applciation.

See [Backend API](./BackendAPI.md) for more details.