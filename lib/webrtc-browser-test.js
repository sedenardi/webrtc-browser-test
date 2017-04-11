'use strict';

(function () {

  var customError = function customError(name, message) {
    var e = new Error(message);
    e.name = name;
    return e;
  };

  var WebRtcBrowserTest = function WebRtcBrowserTest(opts) {

    if (typeof opts.videoElementContainer === 'string') {
      opts.videoElementContainer = document.querySelector(opts.videoElementContainer);
    }
    if (typeof opts.volumeMeterElement === 'string') {
      opts.volumeMeterElement = document.querySelector(opts.volumeMeterElement);
    }

    var getUserMedia = function getUserMedia(constraints) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
      } else if (navigator.getUserMedia) {
        return new Promise(function (resolve, reject) {
          navigator.getUserMedia(constraints, resolve, reject);
        });
      } else if (navigator.mozGetUserMedia) {
        return new Promise(function (resolve, reject) {
          navigator.mozGetUserMedia(constraints, resolve, reject);
        });
      } else if (navigator.webkitGetUserMedia) {
        return new Promise(function (resolve, reject) {
          navigator.webkitGetUserMedia(constraints, resolve, reject);
        });
      }
    };

    var checkBrowser = function checkBrowser() {
      var hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
      return hasGetUserMedia ? Promise.resolve() : Promise.reject(customError('BrowserNotSupported', 'Your browser doesn\'t support WebRTC.'));
    };

    var startVideo = function startVideo() {
      var videoElement = document.querySelector('#videoContainer > video');
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.setAttribute('autoplay', true);
        opts.videoElementContainer.appendChild(videoElement);
      }
      return checkBrowser().then(function () {
        return getUserMedia({ video: true }).then(function (stream) {
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
      checkBrowser: checkBrowser,
      startVideo: startVideo
    };
  };

  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.WebRtcBrowserTest = WebRtcBrowserTest;
  } else {
    module.exports = WebRtcBrowserTest;
  }
})();