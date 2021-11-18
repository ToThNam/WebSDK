# Phenix Web SDK

The Phenix Web SDK provides APIs that enable browsers to stream from and to Phenix PCast&trade;.

The SDK utilizes built-in WebRTC APIs and WebRTC plugins for browsers that do not natively support WebRTC to easily publish and view streams in real-time.

With built-in real-time transcoding options, you can make your content available using chunked live streaming protocols like HLS or MPEG-DASH so that users on legacy devices may still access your content. The platform also support on-demand streaming of time shifted content and of replays after the broadcast has completed.

With Phenix Syncwatch you can ensure simultaneous playout across all devices providing a homogenous experience among your users. Thus preventing next room or neighbor spoilers of your users' favorite content.
Several DRM options are available to protect your content from unauthorized copying.

Please refer to the [PCast&trade; documentation](https://phenixp2p.com/docs) for instructions to setup real-time and live streaming sessions using the extremely scalable PCast&trade; platform.

## PCast&trade; Workflow Example

```sh
npm install
npm start
```

Then goto the [workflow demo page](http://localhost:8888/) that allows you to connect to PCast&trade;.


## Real-time versus Live Streaming

Real-time streaming offers blazing fast video delivery with almost no end-to-end delay. Live streaming, in contrast, is much slower and typically comes with 10 or more seconds end-to-end delay.

Lowering the end-to-end latency ensures your content stays ahead of the Twittersphere and unlocks a truly interactive experience for your audience while avoiding spoilers.