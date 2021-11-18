# Monitor a Stream

Monitor a published stream (local media only) or subscribed stream.

Pass [monitorOptions](#monitor-options) in:
+ [Publish Options](./PCastExpress.md#publish-options)
+ [Subscribe Options](./PCastExpress.md#subscribe-options)

## Monitor Options

```js
var monitorOptions = {
    options: {
        // Optional: Additional options for monitoring a stream

        conditionCountForNotificationThreshold: 4
        // Number of conditions before triggering callback - default 4
    },

    callback: function monitorCallback(error, response) {
        // Optional: Handle monitor event

        if (error) {
          // Handle error
        }

        if (response.retry) {
          response.retry();
          // Re-connects publisher or subscriber stream
        }
    }
}
```