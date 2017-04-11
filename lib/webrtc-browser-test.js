'use strict';

(function () {

  var ParameterError = function ParameterError(message) {
    this.name = 'ParameterError';
    this.message = message || '';
  };
  ParameterError.prototype = Error.prototype;

  var BrowserNotSupportedError = function BrowserNotSupportedError(message) {
    this.name = 'BrowserNotSupportedError';
    this.message = message || '';
  };
  BrowserNotSupportedError.prototype = Error.prototype;

  var VideoNotFoundError = function VideoNotFoundError(message) {
    this.name = 'VideoNotFoundError';
    this.message = message || 'Unable to detect a video camera. Please ensure you\'ve installed and tested your webcam.';
  };
  VideoNotFoundError.prototype = Error.prototype;

  var VideoDeniedError = function VideoDeniedError(message) {
    this.name = 'VideoDeniedError';
    this.message = message || 'Your browser is preventing access to your camera and microphone. Please check your browser settings (usually an icon in the address bar) to enable access.';
  };
  VideoDeniedError.prototype = Error.prototype;

  var AudioNotFoundError = function AudioNotFoundError(message) {
    this.name = 'AudioNotFoundError';
    this.message = message || 'Unable to detect a microphone. Usually your video camera will have an integrated microphone, but if not please attach and enable one.';
  };
  AudioNotFoundError.prototype = Error.prototype;

  var AudioDeniedError = function AudioDeniedError(message) {
    this.name = 'AudioDeniedError';
    this.message = message || 'Your browser is preventing access to your microphone. Please check your browser settings (usually an icon in the address bar) to enable access.';
  };
  AudioDeniedError.prototype = Error.prototype;

  var WebRtcBrowserTest = function WebRtcBrowserTest(opts) {

    if (typeof opts.mediaElementContainer === 'string') {
      opts.mediaElementContainer = document.querySelector(opts.mediaElementContainer);
    }
    if (!opts.mediaElementContainer || !(opts.mediaElementContainer instanceof Element)) {
      throw new ParameterError('Missing required element parameter. Tests can\'t continue.');
    }

    if (opts.onVolumeChange && typeof opts.onVolumeChange !== 'function') {
      throw new ParameterError('Volume callback parameter must be a function. Tests can\'t continue.');
    }

    if (!window.Promise) {
      throw new BrowserNotSupportedError('Your browser doesn\'t support Promises. Tests can\'t continue.');
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
      return hasGetUserMedia ? Promise.resolve() : Promise.reject(new BrowserNotSupportedError('Your browser doesn\'t support WebRTC.'));
    };

    var startVideo = function startVideo() {
      return checkBrowser().then(function () {
        return getUserMedia({ video: true }).then(function (stream) {
          videoElement.srcObject = stream;
          return Promise.resolve();
        }).catch(function (err) {
          if (err.name === 'NotFoundError') {
            throw new VideoNotFoundError();
          } else if (err.name === 'NotAllowedError') {
            throw new VideoDeniedError();
          } else {
            throw err;
          }
        });
      });
    };

    var startAudio = function startAudio() {
      return checkBrowser().then(function () {
        return getUserMedia({ audio: true }).then(function (stream) {
          audioElement.srcObject = stream;
          return startVolume(stream);
        }).catch(function (err) {
          if (err.name === 'NotFoundError') {
            throw new AudioNotFoundError();
          } else if (err.name === 'NotAllowedError') {
            throw new AudioDeniedError();
          } else {
            throw err;
          }
        });
      });
    };

    var createVolumeListener = function createVolumeListener(audioContext, cb) {
      var processor = audioContext.createScriptProcessor(2048, 1, 1);
      processor.connect(audioContext.destination);
      var movingAvg = null;
      processor.onaudioprocess = function (event) {
        var data = event.inputBuffer.getChannelData(0);
        var i = 0;
        var total = 0;
        while (i < data.length) {
          total += Math.abs(data[i++]);
        }
        var rms = Math.sqrt(total / data.length);

        if (movingAvg === null || movingAvg < rms) {
          movingAvg = rms;
        } else {
          movingAvg = 0.7 * movingAvg + 0.3 * rms;
        }

        var logLevel = Math.log(movingAvg) / Math.LN10 / 1.5 + 1;
        logLevel = Math.min(Math.max(logLevel, 0), 1);

        if (cb) {
          cb(logLevel);
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
        return Promise.reject(new BrowserNotSupportedError('Your browser doesn\'t support web audio.'));
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

    var startAll = function startAll() {
      return checkBrowser().then(function () {
        return startVideo();
      }).then(function () {
        return startAudio();
      });
    };

    return {
      checkBrowser: checkBrowser,
      startVideo: startVideo,
      startAudio: startAudio,
      startAll: startAll
    };
  };

  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.WebRtcBrowserTest = WebRtcBrowserTest;
  } else {
    module.exports = WebRtcBrowserTest;
  }
})();