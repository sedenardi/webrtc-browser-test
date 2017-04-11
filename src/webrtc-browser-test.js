(function() {

  const customError = function(name, message) {
    const e = new Error(message);
    e.name = name;
    return e;
  };

  const WebRtcBrowserTest = function(opts) {

    if (typeof opts.mediaElementContainer === 'string') {
      opts.mediaElementContainer = document.querySelector(opts.mediaElementContainer);
    }
    if (!opts.mediaElementContainer) {
      throw customError('ParameterError', 'Missing required element parameter');
    }

    if (!opts.onVolumeChange) {
      throw customError('ParameterError', 'Missing required volume callback parameter');
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
        Promise.reject(customError('BrowserNotSupported', 'Your browser doesn\'t support WebRTC.'));
    };

    const startVideo = function() {
      return checkBrowser().then(() => {
        return getUserMedia({ video: true }).then((stream) => {
          videoElement.srcObject = stream;
          return Promise.resolve();
        });
      });
    };

    const startAudio = function() {
      return checkBrowser().then(() => {
        return getUserMedia({ audio: true }).then((stream) => {
          audioElement.srcObject = stream;
          return startVolume(stream);
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
        return Promise.reject(customError('BrowserNotSupported', 'Your browser doesn\'t support web audio.'));
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

    return {
      checkBrowser,
      startVideo,
      startAudio
    };
  };

  if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
    window.WebRtcBrowserTest = WebRtcBrowserTest;
  } else {
    module.exports = WebRtcBrowserTest;
  }
})();
