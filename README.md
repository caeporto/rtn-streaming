# RTN-Streaming

Real-Time Node.js Streaming (RTN-Streaming) is a server side implementation of livestreaming using Node.js and the Real-Time Streaming Protocol 1.0 (RTSP) following [RFC 2326](https://tools.ietf.org/html/rfc2326).

## Installation

```
npm i rtn-streaming
```

## Usage
RTN-Streaming can stream via UDP or TCP Interleaved, as of now it is compliant with FFmpeg only, so streams should only be published and read using it.

Run the RTSP Server:

```js
let rtn_stream_server = require('rtn-streaming');

rtn_stream_server.listen(8554, 8000, 8001);
```

Publish a looping video as a livestream via TCP:

```
ffmpeg -re -stream_loop -1 -i <<video.mp4>> -c copy -f rtsp -rtsp_transport tcp rtsp://IP_OR_HOSTNAME:8554/livestream_test
```

Or via UDP:

```
ffmpeg -re -stream_loop -1 -i <<video.mp4>> -c copy -f rtsp -rtsp_transport udp rtsp://IP_OR_HOSTNAME:8554/livestream_test
```

And then watch it using ffplay:

```
ffplay -rtsp_transport tcp rtsp://IP_OR_HOSTNAME:8554/livestream_test
```
