(function() {

  const customError = function(name, message) {
    const e = new Error(message);
    e.name = name;
    return e;
  };

  const WebRtcBrowserTest = function(opts) {

    if (typeof opts.videoElementContainer === 'string') {
      opts.videoElementContainer = document.querySelector(opts.videoElementContainer);
    }
    if (typeof opts.volumeMeterElement === 'string') {
      opts.volumeMeterElement = document.querySelector(opts.volumeMeterElement);
    }

    const getUserMedia = function(constraints) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
      } else if (navigator.getUserMedia) {
        return new Promise((resolve, reject) => {
          navigator.getUserMedia(constraints, resolve, reject);
        });
      } else if (navigator.mozGetUserMedia) {
        return new Promise((resolve, reject) => {
          navigator.mozGetUserMedia(constraints, resolve, reject);
        });
      } else if (navigator.webkitGetUserMedia) {
        return new Promise((resolve, reject) => {
          navigator.webkitGetUserMedia(constraints, resolve, reject);
        });
      }
    };

    const checkBrowser = function() {
      const hasGetUserMedia =
        (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
        navigator.getUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia;
      return hasGetUserMedia ? Promise.resolve() :
        Promise.reject(customError('BrowserNotSupported', 'Your browser doesn\'t support WebRTC.'));
    };

    const startVideo = function() {
      let videoElement = document.querySelector('#videoContainer > video');
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.setAttribute('autoplay', true);
        opts.videoElementContainer.appendChild(videoElement);
      }
      return checkBrowser().then(() => {
        return getUserMedia({ video: true }).then((stream) => {
          videoElement.srcObject = stream;
          return Promise.resolve();
        });
      });
    };

    // const startAudio = function() {
    //   return checkBrowser().then(() => {
    //
    //   });
    // };
    //
    // const startTest = function() {
    //   return checkBrowser().then(() => {
    //     return startVideo();
    //   }).then(() => {
    //     return startAudio();
    //   });
    // };

    return {
      checkBrowser,
      startVideo,
      // startAudio,
      // startTest
    };
  };

  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.WebRtcBrowserTest = WebRtcBrowserTest;
  } else {
    module.exports = WebRtcBrowserTest;
  }
})();
