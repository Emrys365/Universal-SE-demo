/*************************************************************************
         (C) Copyright AudioLabs 2017

This source code is protected by copyright law and international treaties. This source code is made available to You subject to the terms and conditions of the Software License for the webMUSHRA.js Software. Said terms and conditions have been made available to You prior to Your download of this source code. By downloading this source code You agree to be bound by the above mentionend terms and conditions, which can also be found here: https://www.audiolabs-erlangen.de/resources/webMUSHRA. Any unauthorised use of this source code may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.

**************************************************************************/

function MultiConditionDemoAudioControl(_audioContext, _bufferSize, _samples, _sampleRates, _errorHandler, _currentCondition) {
  this.audioContext = _audioContext;
  this.bufferSize = parseInt(_bufferSize);
  this.samples = _samples;
  this.errorHandler = _errorHandler;
  this.currentCondition = _currentCondition;

  this.audioPlaying = false;
  this.audioCurrentPosition = [];
  this.audioSampleRate = [];
  this.audioLoopStart = [];
  this.audioLoopEnd = null;
  this.audioMaxPosition = null;
  this.audioStimulus = null;
  this.audioLoopingActive = true;

  this.audioFadingActive = 0; // 0 = no, 1 = fade_out, 2 = fade_in
  this.audioFadingIn = null;
  this.audioFadingCurrentPosition = [];
  this.audioFadingMaxPosition = [];
  this.audioMinimumLoopDuration = [];
  this.audioVolume = 1.0;

  // requests
  this.audioCurrentPositionRequest = [];
  this.audioFadingActiveRequest = [];

  //listeners
  this.eventListeners = [];

  var samplesMinLength = [];
  for (var i = 0; i < this.samples.length; i++) {
    samplesMinLength[i] = Math.min.apply(null, this.samples[i].map(function(item) { return item.getAudioBuffer().length; }));
    this.audioLoopStart[i] = 0;
    this.audioCurrentPosition[i] = 0;
    this.audioFadingCurrentPosition[i] = 0;
    this.audioCurrentPositionRequest[i] = null;
    this.audioFadingActiveRequest[i] = null;
  }

  this.audioLoopEnd = samplesMinLength;
  this.audioMaxPosition = [];
  for (var i = 0; i < this.samples.length; i++) {
    this.audioMaxPosition[i] = samplesMinLength[i];
  }
  this.audioSampleRate = _sampleRates;
  for (var i = 0; i < this.samples.length; i++) {
    this.audioFadingMaxPosition[i] = parseInt(this.audioSampleRate[i] * 0.005);
    this.audioMinimumLoopDuration[i] = parseInt(this.audioSampleRate[i] * 0.25);
  }
}


MultiConditionDemoAudioControl.prototype.removeEventListener = function(_index) {
  this.eventListeners[_index] = null;
};


MultiConditionDemoAudioControl.prototype.addEventListener = function(_listenerFunction) {
  this.eventListeners[this.eventListeners.length] = _listenerFunction;
  return this.eventListeners.length-1;
};

MultiConditionDemoAudioControl.prototype.sendEvent = function(_event) {
  for (var i = 0; i < this.eventListeners.length; ++i) {
  	if (this.eventListeners[i] === null) {
  		continue;
  	}
    this.eventListeners[i](_event);
  }
};

MultiConditionDemoAudioControl.prototype.getPosition = function() {
  return this.audioCurrentPosition[this.currentCondition];
};

MultiConditionDemoAudioControl.prototype.getDuration = function() {
  return this.audioMaxPosition[this.currentCondition];
};

MultiConditionDemoAudioControl.prototype.initAudio = function() {
  this.dummyBufferSource = this.audioContext[this.audioSampleRate[this.currentCondition]].createBufferSource(); // nothing to do
  this.dummyBufferSource.loop = true;
  this.dummyBufferSource.buffer = this.audioContext[this.audioSampleRate[this.currentCondition]].createBuffer(1, this.bufferSize, this.audioSampleRate[0]);

  var channelCount = (this.samples[0][0].getAudioBuffer().numberOfChannels > 2) ?  this.audioContext[this.audioSampleRate[this.currentCondition]].destination.channelCount : this.samples[0][0].getAudioBuffer().numberOfChannels;
  this.scriptNode = this.audioContext[this.audioSampleRate[this.currentCondition]].createScriptProcessor(this.bufferSize, 1, channelCount);
  this.scriptNode.onaudioprocess = (function(audioProcessingEvent) { this.process(audioProcessingEvent); }).bind(this);

  this.dummyBufferSource.connect(this.scriptNode);
  this.scriptNode.connect(this.audioContext[this.audioSampleRate[this.currentCondition]].destination);
  this.dummyBufferSource.start();
};

MultiConditionDemoAudioControl.prototype.freeAudio = function() {
  this.stop();

  this.dummyBufferSource.disconnect(); // TODO mschoeff hard stop
  this.scriptNode.disconnect();

  this.scriptNode.onaudioprocess = null;
  this.dummyBufferSource = null; // nothing to do
  this.scriptNode = null;
};

MultiConditionDemoAudioControl.prototype.setLoopingActive = function(_loopingActive) {
  this.audioLoopingActive = _loopingActive;
};

MultiConditionDemoAudioControl.prototype.isLoopingActive = function() {
  return this.audioLoopingActive;
};


MultiConditionDemoAudioControl.prototype.process = function(audioProcessingEvent) {

  var outputBuffer = audioProcessingEvent.outputBuffer;
  var inputBuffer = audioProcessingEvent.inputBuffer;

  var stimulus = this.audioStimulus;
  var sample;
  var ramp;
  var outputData;
  var channel;

  if (stimulus === null || this.audioPlaying === false) {
    // set to zero
    for (channel = 0; channel < outputBuffer.numberOfChannels; ++channel) {
      outputData = outputBuffer.getChannelData(channel);
      for (sample = 0; sample < outputBuffer.length; ++sample) {
        outputData[sample] = 0;
      }
    }
    return;
  }

  var audioBuffer = stimulus.getAudioBuffer();

  if (this.audioCurrentPosition[this.currentCondition] < this.audioLoopStart[this.currentCondition]) {
    this.audioCurrentPosition[this.currentCondition] = this.audioLoopStart[this.currentCondition];
  }


  if (this.audioCurrentPositionRequest[this.currentCondition] !== null) {
    this.audioCurrentPosition[this.currentCondition] = this.audioCurrentPositionRequest[this.currentCondition];
    this.audioCurrentPositionRequest[this.currentCondition] = null;
  }
  if (this.audioFadingActiveRequest[this.currentCondition] !== null) {
    this.audioFadingActive = this.audioFadingActiveRequest[this.currentCondition];
    this.audioFadingActiveRequest[this.currentCondition] = null;
  }
  var currentPosition = null;
  var fadingCurrentPosition = null;
  var fadingActive = null;
  var loopingActive = this.audioLoopingActive;

  for (channel = 0; channel < this.samples[this.currentCondition][0].getAudioBuffer().numberOfChannels; ++channel) {
    outputData = outputBuffer.getChannelData(channel);
    inputData = audioBuffer.getChannelData(channel);
    currentPosition = this.audioCurrentPosition[this.currentCondition];
    fadingCurrentPosition = this.audioFadingCurrentPosition[this.currentCondition];
    fadingActive = this.audioFadingActive;

    var a =[];
    var b = [];
    for (sample = 0; sample < outputBuffer.length; ++sample) {

      if (loopingActive && (currentPosition == (this.audioLoopEnd[this.currentCondition] - this.audioFadingMaxPosition[this.currentCondition]))) { // loop almost at end => fading is triggered
        fadingActive = 1;
        this.audioFadingIn = this.audioStimulus;
        fadingCurrentPosition = 0;
      }

      if (fadingActive == 1) { // fade out
        ramp = 0.5 * (1 + Math.cos(Math.PI*(fadingCurrentPosition++)/(this.audioFadingMaxPosition[this.currentCondition]-1)));
        outputData[sample] = inputData[currentPosition++] * ramp;
        if (fadingCurrentPosition >= this.audioFadingMaxPosition[this.currentCondition]) {
          fadingActive = 2;
          fadingCurrentPosition = 0;
          if (this.audioFadingIn === null) {
            this.audioPlaying = false;
            fadingCurrentPosition = 0;
            fadingActive = 0;
            for (; sample < outputBuffer.length; ++sample) {
              outputData[sample] = 0;
            }
            break;
          } else {
            stimulus = this.audioStimulus = this.audioFadingIn;
            inputData = stimulus.getAudioBuffer().getChannelData(channel);
          }

        }
      } else if (fadingActive == 2) { // fade in
        ramp = 0.5 * (1 - Math.cos(Math.PI*(fadingCurrentPosition++)/(this.audioFadingMaxPosition[this.currentCondition]-1)));
        outputData[sample] = inputData[currentPosition++] * ramp;
        if (fadingCurrentPosition >= this.audioFadingMaxPosition[this.currentCondition]) {
          fadingCurrentPosition = 0;
          fadingActive = 0;
        }
      } else {
        outputData[sample] = inputData[currentPosition++];
      }
      if (currentPosition >= this.audioLoopEnd[this.currentCondition]) {
        currentPosition = this.audioLoopStart[this.currentCondition];
        if (loopingActive === false) {
          this.audioPlaying = false;
        }
      }
    }
  }

  // volume

  for (channel = 0; channel < outputBuffer.numberOfChannels; ++channel) {
    outputData = outputBuffer.getChannelData(channel);
    for (sample = 0; sample < outputBuffer.length; ++sample) {
      outputData[sample] = outputData[sample] * this.audioContext[this.audioSampleRate[this.currentCondition]].volume;
    }
  }


  // volume

  this.audioCurrentPosition[this.currentCondition] = currentPosition;
  this.audioFadingCurrentPosition[this.currentCondition] = fadingCurrentPosition;
  this.audioFadingActive = fadingActive;

  var event = {
  	name: 'processUpdate',
  	currentSample:  this.audioCurrentPosition[this.currentCondition],
  	sampleRate: this.audioSampleRate[this.currentCondition]
  };
  this.sendEvent(event);

};

MultiConditionDemoAudioControl.prototype.setLoopStart = function(_start) {
  if (_start >= 0 && _start < this.audioLoopEnd[this.currentCondition] && (this.audioLoopEnd[this.currentCondition]-_start) >= this.audioMinimumLoopDuration[this.currentCondition]) {
    this.audioLoopStart[this.currentCondition] = _start;
    if (this.audioCurrentPosition[this.currentCondition] < this.audioLoopStart[this.currentCondition]) {
      this.audioCurrentPositionRequest[this.currentCondition] = this.audioLoopStart[this.currentCondition];
    }
    var event = {
      name: 'loopStartChanged',
      start : this.audioLoopStart[this.currentCondition],
      end : this.audioLoopEnd[this.currentCondition]
    };
    this.sendEvent(event);
  }
};

MultiConditionDemoAudioControl.prototype.setLoopEnd = function(_end) {
  if (_end <= this.audioMaxPosition[this.currentCondition] && _end > this.audioLoopStart[this.currentCondition] && (_end-this.audioLoopStart[this.currentCondition]) >= this.audioMinimumLoopDuration[this.currentCondition]) {
    this.audioLoopEnd[this.currentCondition] = _end;
    if (this.audioCurrentPosition[this.currentCondition] > this.audioLoopEnd[this.currentCondition]) {
      this.audioCurrentPositionRequest[this.currentCondition] = this.audioLoopEnd[this.currentCondition];
    }
    var event = {
      name: 'loopEndChanged',
      start : this.audioLoopStart[this.currentCondition],
      end : this.audioLoopEnd[this.currentCondition]
    };
    this.sendEvent(event);
  }
};

MultiConditionDemoAudioControl.prototype.setLoop = function(_start, _end) {
  var changed = false;
  if (_start >= 0 && _start < this.audioLoopEnd[this.currentCondition] && (_end-_start) >= this.audioMinimumLoopDuration[this.currentCondition]
    && _start != this.audioLoopStart[this.currentCondition]) {
    this.audioLoopStart[this.currentCondition] = _start;
    if (this.audioCurrentPosition[this.currentCondition] < this.audioLoopStart[this.currentCondition]) {
      this.audioCurrentPositionRequest[this.currentCondition] = this.audioLoopStart[this.currentCondition];
    }
    changed = true;
  }
  if (_end <= this.audioMaxPosition[this.currentCondition] && _end > this.audioLoopStart[this.currentCondition] && (_end-_start) >= this.audioMinimumLoopDuration[this.currentCondition]
    && _end != this.audioLoopEnd[this.currentCondition]) {
    this.audioLoopEnd[this.currentCondition] = _end;
    if (this.audioCurrentPosition[this.currentCondition] > this.audioLoopEnd[this.currentCondition]) {
      this.audioCurrentPositionRequest[this.currentCondition] = this.audioLoopEnd[this.currentCondition];
    }
    changed = true;
  }

  if (changed == true) {
    var event = {
      name: 'loopChanged',
      start : this.audioLoopStart[this.currentCondition],
      end : this.audioLoopEnd[this.currentCondition]
    };
    this.sendEvent(event);
  }
};


MultiConditionDemoAudioControl.prototype.setPosition = function(_position, _setStartEnd) {
  this.audioCurrentPositionRequest[this.currentCondition] = _position;
  if(_setStartEnd){
	  if (_position < this.audioLoopStart[this.currentCondition] || _position <= parseInt((this.audioLoopEnd[this.currentCondition] + this.audioLoopStart[this.currentCondition])/2)) {
	    this.setLoopStart(_position);
	  }else if (_position > this.audioLoopEnd[this.currentCondition] || _position > parseInt((this.audioLoopEnd[this.currentCondition] + this.audioLoopStart[this.currentCondition])/2)) {
	    this.setLoopEnd(_position);
	  }
  }
  var eventUpdate = {
    name: 'processUpdate',
    currentSample:  this.audioCurrentPositionRequest[this.currentCondition],
    sampleRate: this.audioSampleRate[this.currentCondition]
  };
  this.sendEvent(eventUpdate);
};

MultiConditionDemoAudioControl.prototype.getNumSamples = function() {
  return this.audioMaxPosition[this.currentCondition];
};



MultiConditionDemoAudioControl.prototype.play = function(_stimulus) {
  if (_stimulus === null) {
    _stimulus = this.audioStimulus;
  }

  if ((this.audioStimulus !== _stimulus) 	&& this.audioStimulus !== null && this.audioPlaying !== false) {
    this.fadeOut(_stimulus);
  } else {
    this.audioStimulus = _stimulus;
    if (this.audioPlaying === false) {
      this.fadeIn(_stimulus);
    }
  }
  this.audioPlaying = true;
};

MultiConditionDemoAudioControl.prototype.getActiveStimulus = function() {
  return this.audioStimulus;
};

MultiConditionDemoAudioControl.prototype.playSample = function(_index) {
  this.play(this.samples[this.currentCondition][_index], false);
  var event = {
  	name: 'playSampleTriggered',
  	index : _index,
  	length : this.samples[this.currentCondition].length
  };
  this.sendEvent(event);

  return;
};


MultiConditionDemoAudioControl.prototype.fadeOut = function(_stimulusFadeIn) {
  this.audioFadingIn = _stimulusFadeIn;
  this.audioFadingCurrentPositionRequest = 0;
  this.audioFadingActiveRequest[this.currentCondition] = 1;
};

MultiConditionDemoAudioControl.prototype.fadeIn = function(_stimulusFadeIn) {
  this.audioFadingIn = _stimulusFadeIn;
  this.audioFadingCurrentPositionRequest = 0;
  this.audioFadingActiveRequest[this.currentCondition] = 2;
};



MultiConditionDemoAudioControl.prototype.pause = function() {
  if (this.audioPlaying === true) {
    this.fadeOut(null);
  }
  var event = {
    name: 'pauseTriggered',
    sampleLength : this.samples.length
  };
  this.sendEvent(event);
  return;
};


MultiConditionDemoAudioControl.prototype.stop = function() {
  this.audioCurrentPositionRequest[this.currentCondition] = this.audioLoopStart[this.currentCondition];
  if (this.audioPlaying === true) {
    this.fadeOut(null);
  }
  var event = {
    name: 'stopTriggered',
    sampleLength : this.samples[this.currentCondition].length
  };
  this.sendEvent(event);

  var eventUpdate = {
    name: 'processUpdate',
    currentSample:  this.audioCurrentPositionRequest[this.currentCondition],
    sampleRate: this.audioSampleRate[this.currentCondition]
  };
  this.sendEvent(eventUpdate);


  return;
};


MultiConditionDemoAudioControl.prototype.getSamples = function() {
  return this.samples[this.currentCondition];
};

