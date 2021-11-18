# Backend API

Your backend must have the following rest api setup. This is required in order to make secure requests to the Phenix Admin API.

+ POST
    + /auth
    + /stream

These endpoints will act as a proxy for the [Phenix Admin API](https://phenixp2p.com/docs).

#### /auth

##### Request

```sh
POST /path/auth HTTP/1.1
Host: //hostname/
Accept: application/json
Content-Type: application/json
Content-Length: 59

{
 "...authenticationData": "<authenticationData>",
}
```

- **authenticationData**: `Required` We pass through all of the authentication data you provide when setting up the Express API. See [Express Options - authenticationData](./README.md#express-options)

##### Response

The stream platform will return a successful response that contains a "status" and an "authenticationToken" field. The HTTP status code is set according to the "status" field. Your backend should forward the successful response (ok) from the Phenix Admin API request to the frontend.

```sh
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 52

{"status":"ok","authenticationToken":"us-east#VaTd"}
```

- **authenticationToken**: The authentication token to use by your client

#### /stream

Stream tokens are generated using a  POST request. If you provide an "originStreamId", a view token is generated. Otherwise, a publish token is generated.

##### Request

```sh
POST /path/auth HTTP/1.1
Host: //hostname/
Accept: application/json
Content-Type: application/json
Content-Length: 59

{
 "...authenticationData": "<authenticationData>",
 "sessionId": "<sessionId>",
 "originStreamId": "<originStreamId>",
 "capabilities": "<capabilities>"
}
```

- **authenticationData**: `Required` We pass through all of the authentication data you provide when setting up the Express API. See [Express Options - authenticationData](./README.md#express-options)
- **sessionId**: `Required` The session ID of the client that you are generating this token for or the wildcard "*" enabling any authorized session to use the token
- **originStreamId**: `Optional` The stream ID of the published stream that you want to make available for viewing (omitted when creating a publish token)
- **capabilities**: `Optional` An array of capabilities for the new stream

##### Response

The stream platform will return a successful response that contains a "status" and a "streamToken" field. The HTTP status code is set according to the "status" field.

```sh
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 44

{"status":"ok","streamToken":"us-east#C1Nl"}
```

- **streamToken**: The stream token to use by your client for publishing and subscribing

For more information about capabilities and other details, see our [Admin API](https://phenixp2p.com/docs) documentation.

## Backend Rest API - Example

Example with NodeJS and Express. Use the following code in your **Backend-Server**.

```js
var express = require('express');
var router = express.Router();
var request = require('request');
var url = require('url');
var backoff = require('backoff');
var validCredentials = {'demo-username': 'demo-password'};
var adminURI = url.resolve('https://pcast.phenixp2p.com', '/pcast/');
var data = {
  length: 256,
  applicationId: process.env.PHENIX_APPLICATION_ID, // We provide you with an Application Id
  secret: process.env.PHENIX_SECRET,                // We provide you with a Secret
};

router.post('/auth', function(req, res) {
  const name = req.body.name;
  const password = req.body.password;
  if (validCredentials[name] !== password) {
    console.log('\tinvalid credentials: ' + Object.keys(req.body));
    res.sendStatus(403);
  } else {
    requestWithBackoff(adminAuth, req, res);
  }
});
router.post('/stream', function(req, res) {
  requestWithBackoff(adminStream, req, res);
});

function adminAuth(req, res) {
  request({
    url: adminURI + 'auth',
    method: 'POST',
    json: {
      applicationId: data.applicationId,
      secret: data.secret,
      length: data.length,
    },
  }, makeHandler(res));
}

function adminStream(req, res) {
  const body = req.body;
  const json = {
    applicationId: data.applicationId,
    sessionId: body.sessionId,
    secret: data.secret,
  };

  if (body.originStreamId) {
    json.originStreamId = body.originStreamId;
  }

  if (body.capabilities) {
    json.capabilities = body.capabilities;
  }

  if (body.reason) {
    json.reason = body.reason;
  }

  request({
    url: adminURI + 'stream',
    method: 'POST',
    json: json,
  }, makeHandler(res));
}

function requestWithBackoff(requester, req, res) {
  const call = backoff.call(requester, req, res, function(err, res) {
    console.log('Num retries: ' + call.getNumRetries());

    if (err) {
      res.sendStatus(err.status);
    } else {
      console.log('Status: ' + res.statusCode);
    }
  });
  call.retryIf(function(err) {
    return err.status >= 500 && err.status !== 503;
  });
  call.setStrategy(new backoff.FibonacciStrategy({initialDelay: 1000}));
  call.failAfter(3);
  call.start();
}

function makeHandler(res) {
  const handler = (function() {
    const responseToSend = res;
    return function(error, response, body) {
      if (!error && response.statusCode === 200) {
        console.log('\tsuccess');
        responseToSend.send(body);
      } else if (response === undefined) {
        console.log('\tno response from server');
        responseToSend.sendStatus(500);
      } else {
        console.log('\tfail:' + response.statusCode);
        responseToSend.sendStatus(response.statusCode);
      }
    };
  })();
  return handler;
}

module.exports = router;
```

Consume the Express Router in your Express App.

```js
var express = require('express');
var api = require('./../server/api.js');
var app = express();

app.use('/pcast', api);
```

In the **Browser**, pass the `backendUri` of your server you just set up to the express api of your choice.
```js
var pcastExpress = sdk.express.PCastExpress({
    backendUri: '//hostname/pcast',
    authenticationData: {
        name: 'demo-username',
        password: 'demo-password'
    } // See Below (1)
});
```

`(1)` Name and Password are static here for the purposes of this example. You should provide your own mechanism for authenticating the user.
