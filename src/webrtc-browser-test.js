(function() {

  const ParameterError = function(message) {
    this.name = 'ParameterError';
    this.message = (message || '');
  };
  ParameterError.prototype = Error.prototype;

  const BrowserNotSupportedError = function(message) {
    this.name = 'BrowserNotSupportedError';
    this.message = (message || '');
  };
  BrowserNotSupportedError.prototype = Error.prototype;

  const VideoNotFoundError = function(message) {
    this.name = 'VideoNotFoundError';
    this.message = (message || 'Unable to detect a video camera. Please ensure you\'ve installed and tested your webcam.');
  };
  VideoNotFoundError.prototype = Error.prototype;

  const VideoDeniedError = function(message) {
    this.name = 'VideoDeniedError';
    this.message = (message || 'Your browser is preventing access to your camera and microphone. Please check your browser settings (usually an icon in the address bar) to enable access.');
  };
  VideoDeniedError.prototype = Error.prototype;

  const AudioNotFoundError = function(message) {
    this.name = 'AudioNotFoundError';
    this.message = (message || 'Unable to detect a microphone. Usually your video camera will have an integrated microphone, but if not please attach and enable one.');
  };
  AudioNotFoundError.prototype = Error.prototype;

  const AudioDeniedError = function(message) {
    this.name = 'AudioDeniedError';
    this.message = (message || 'Your browser is preventing access to your microphone. Please check your browser settings (usually an icon in the address bar) to enable access.');
  };
  AudioDeniedError.prototype = Error.prototype;

  const WebRtcBrowserTest = function(opts) {

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

    let videoElement = document.querySelector('#videoContainer > video');
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.setAttribute('autoplay', true);
      opts.mediaElementContainer.appendChild(videoElement);
    }

    let audioElement = document.querySelector('#videoContainer > audio');
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.setAttribute('autoplay', true);
      opts.mediaElementContainer.appendChild(audioElement);
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
        Promise.reject(new BrowserNotSupportedError('Your browser doesn\'t support WebRTC.'));
    };

    let cameraStream;
    const startVideo = function() {
      return checkBrowser().then(() => {
        return getUserMedia({ video: true }).then((stream) => {
          cameraStream = stream;
          videoElement.srcObject = stream;
          return Promise.resolve();
        }).catch((err) => {
          if (err.name === 'NotFoundError') {
            throw new VideoNotFoundError();
          } else if (err.name === 'NotAllowedError') {
            throw new VideoDeniedError();
          } else if (err.name === 'PermissionDeniedError') {
            throw new VideoDeniedError();
          } else {
            throw err;
          }
        });
      });
    };

    const QUIET_VOLUME = 0.2;
    const startAudio = function() {
      return checkBrowser().then(() => {
        return getUserMedia({ audio: true }).then((stream) => {
          audioElement.srcObject = stream;
          audioElement.volume = QUIET_VOLUME;
          return startVolume(stream);
        }).catch((err) => {
          if (err.name === 'NotFoundError') {
            throw new AudioNotFoundError();
          } else if (err.name === 'NotAllowedError') {
            throw new AudioDeniedError();
          } else if (err.name === 'PermissionDeniedError') {
            throw new AudioDeniedError();
          } else {
            throw err;
          }
        });
      });
    };


    const createVolumeListener = function(audioContext, cb) {
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processor.connect(audioContext.destination);
      let movingAvg = null;
      processor.onaudioprocess = function(event) {
        const data = event.inputBuffer.getChannelData(0);
        let i = 0;
        let total = 0;
        while (i < data.length) {
          total += Math.abs(data[i++]);
        }
        const rms = Math.sqrt(total / data.length);

        if (movingAvg === null || movingAvg < rms) {
          movingAvg = rms;
        } else {
          movingAvg = 0.7 * movingAvg + 0.3 * rms;
        }

        let logLevel = (Math.log(movingAvg) / Math.LN10) / 1.5 + 1;
        logLevel = Math.min(Math.max(logLevel, 0), 1);

        if (cb) { cb(logLevel); }
      };
      return processor;
    };

    const startVolume = function(stream) {
      let audioContext;
      try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
      } catch (e) {
        return Promise.reject(new BrowserNotSupportedError('Your browser doesn\'t support web audio.'));
      }
      const listener = createVolumeListener(audioContext, opts.onVolumeChange);
      try {
        const mic = audioContext.createMediaStreamSource(stream);
        mic.connect(listener);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    };

    const startAll = function() {
      return checkBrowser().then(() => {
        return startVideo();
      }).then(() => {
        return startAudio();
      });
    };

    const adjustVolume = function(volume) {
      audioElement.volume = volume;
    };

    const checkScreenSharing = function() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    };

    let screenStream;
    const startScreenSharing = function() {
      if (!checkScreenSharing()) {
        return Promise.reject(new BrowserNotSupportedError('Your browser doesn\'t support screen sharing.'));
      }
      return navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
        screenStream = stream;
        videoElement.srcObject = screenStream;
      }).catch(console.log);
    };

    const endScreenSharing = function() {
      if (!screenStream) {
        throw new Error('Screen sharing hasn\'t been started yet.');
      }
      videoElement.srcObject = cameraStream;
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    };

    return {
      checkBrowser,
      startVideo,
      startAudio,
      startAll,
      adjustVolume,
      checkScreenSharing,
      startScreenSharing,
      endScreenSharing
    };
  };

  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.WebRtcBrowserTest = WebRtcBrowserTest;
  } else {
    module.exports = WebRtcBrowserTest;
  }
})();
