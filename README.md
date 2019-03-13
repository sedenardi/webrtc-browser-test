webrtc-browser-test
===================

Test video and audio capabilities of the browser, verifying hardware works properly.

This detects whether your browser supports the WebRTC API for video and audio, gathers video and audio hardware information, and initializes video and audio streaming to the browser. It will give feedback for whether the user has granted permission to the browser, and whether any other errors have occurred. It will also provide volume information from the microphone if it's enabled and working properly.

This will throw a few custom types of errors, depending on what breaks and when.

* `ParameterError` - Parameter passed is either missing or incorrect type.
* `BrowserNotSupportedError` - The browser either doesn't support `Promise`s, WebRTC, or Web Audio (used for the volume meter).
* `VideoNotFoundError` - The browser couldn't detect any video input hardware.
* `VideoDeniedError` - The user denied permission to the browser to use the video input.
* `AudioNotFoundError` - The browser couldn't detect any audio input hardware.
* `AudioDeniedError` - The user denied permission to the browser to use the audio input.

Dependencies
------------

None

Usage
-----

```javascript
var browserTest = WebRtcBrowserTest(opts);
browserTest.startAll();
```

Options:

* `mediaElementContainer` (required) - The element (or selector) of where you want the video and audio elements to appear on the page.
* `onVolumeChange` (optional) - Callback returning the current volume (RMS normalized from 0 to 1).

`webrtc-browser-test` uses `Promise`s to run the various tests. The tests you can run are:

* `checkBrowser()` - Check whether the browser has the `getUserMedia()` method.
* `startVideo()` - Requests local video access and displays it in the browser.
* `startAudio()` - Requests local video access and outputs it to the speakers. Also begins outputting volume to the optional `onVolumeChange` callback.
* `startAll()` - Run all the above tests.
* `checkScreenSharing()` - Check whether the browser supports the `getDisplayMedia` method.
* `startScreenSharing()` - Initiates screen sharing.
* `endScreenSharing()` - Stops screen sharing and resumes using the camera.

Example
-------

```javascript
var browserTest = WebRtcBrowserTest({
  mediaElementContainer: '#mediaContainer',
  onVolumeChange: function(level) {
    console.log('Volume: ' + level);
  }
});
browserTest.startAll().then(function() {
  console.log('started');
}).catch(function(err) {
  message.innerHTML = err.name + '\n' + err.message;
  console.log(err);
});
```

See `index.html` for full working example.

Demo
----

`npm run demo`

License
-------

MIT
