'use strict';

(function () {

  var customError = function customError(name, message) {
    var e = new Error(message);
    e.name = name;
    return e;
  };

  var WebRtcBrowserTest = function WebRtcBrowserTest(opts) {

    if (typeof opts.mediaElementContainer === 'string') {
      opts.mediaElementContainer = document.querySelector(opts.mediaElementContainer);
    }
    if (!opts.mediaElementContainer) {
      throw customError('ParameterError', 'Missing required element parameter');
    }

    if (!opts.onVolumeChange) {
      throw customError('ParameterError', 'Missing required volume callback parameter');
    }

    var videoElement = document.querySelector('#videoContainer > video');
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.setAttribute('autoplay', true);
      opts.mediaElementContainer.appendChild(videoElement);
    }

    var audioElement = document.querySelector('#videoContainer > audio');
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.setAttribute('autoplay', true);
      opts.mediaElementContainer.appendChild(audioElement);
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
      return checkBrowser().then(function () {
        return getUserMedia({ video: true }).then(function (stream) {
          videoElement.srcObject = stream;
          return Promise.resolve();
        });
      });
    };

    var startAudio = function startAudio() {
      return checkBrowser().then(function () {
        return getUserMedia({ audio: true }).then(function (stream) {
          audioElement.srcObject = stream;
          return startVolume(stream);
        });
      });
    };

    var createVolumeListener = function createVolumeListener(audioContext, cb) {
      var processor = audioContext.createScriptProcessor(2048, 1, 1);
      processor.connect(audioContext.destination);
      processor.onaudioprocess = function (event) {
        var data = event.inputBuffer.getChannelData(0);
        var i = 0;
        var total = 0;
        while (i < data.length) {
          total += Math.abs(data[i++]);
        }
        var rms = Math.sqrt(total / data.length);
        if (cb) {
          cb(rms);
        }
      };
      return processor;
    };

    var startVolume = function startVolume(stream) {
      var audioContext = void 0;
      try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
      } catch (e) {
        return Promise.reject(customError('BrowserNotSupported', 'Your browser doesn\'t support web audio.'));
      }
      var listener = createVolumeListener(audioContext, opts.onVolumeChange);
      try {
        var mic = audioContext.createMediaStreamSource(stream);
        mic.connect(listener);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    };

    return {
      checkBrowser: checkBrowser,
      startVideo: startVideo,
      startAudio: startAudio
    };
  };

  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.WebRtcBrowserTest = WebRtcBrowserTest;
  } else {
    module.exports = WebRtcBrowserTest;
  }
})();