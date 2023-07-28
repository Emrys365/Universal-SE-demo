/*************************************************************************
         (C) Copyright AudioLabs 2017

This source code is protected by copyright law and international treaties. This source code is made available to You subject to the terms and conditions of the Software License for the webMUSHRA.js Software. Said terms and conditions have been made available to You prior to Your download of this source code. By downloading this source code You agree to be bound by the above mentionend terms and conditions, which can also be found here: https://www.audiolabs-erlangen.de/resources/webMUSHRA. Any unauthorised use of this source code may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.

**************************************************************************/

function MultiWaveformVisualizer(_variableName, _parent, _stimulus, _showWaveform, _enableLooping, _mushraAudioControl, _index, _currentCondition){
  this.variableName = _variableName;
  this.parent = _parent;
  this.stimulus = _stimulus;
  this.showWaveform = _showWaveform;
  this.enableLooping = _enableLooping;
  this.mushraAudioControl = _mushraAudioControl;
  this.index = _index;
  this.currentCondition = _currentCondition;

  this.table = $('<table id="waveTable" name="waveTable' + this.index + '"></table>');
  this.slider = $('<div id="slider" name="slider' + this.index + '"></div');
  this.parentWavesurfer = $('<div id="parentWavesurfer name="parentWavesurfer' + this.index + '""></div');
  this.parentSlider = $('<div></div>');
  this.canvas = document.createElement("canvas");
  this.context = this.canvas.getContext("2d");

  if(this.enableLooping){
    this.parent.append(this.table);
  }else{

    this.parent.append(this.parentWavesurfer);
  }

  this.avgOriginalSamples = [];
  for (var jj = 0; jj < this.stimulus.length; ++jj) {
    this.avgOriginalSamples[jj] = [];
    for (var ii = 0; ii < this.stimulus[jj].length; ++ii) {
      var audioBuffer = this.stimulus[jj][ii].getAudioBuffer();
      var numberOfChannels = audioBuffer.numberOfChannels;
      this.avgOriginalSamples[jj][ii] = new Float32Array(audioBuffer.length);
      
      for(var i = 0; i < audioBuffer.length; ++i) {
        var sum = 0;
        for(var j = 0; j < numberOfChannels; j++){
          sum += audioBuffer.getChannelData(j)[i];
        }
        var avg = sum * (1.0/numberOfChannels);
        this.avgOriginalSamples[jj][ii][i] = avg;
      }
    }
  }
  this.resampledSamples = [];
  for (var jj = 0; jj < this.stimulus.length; ++jj) {
    this.resampledSamples[jj] = [];
    for (var ii = 0; ii < this.stimulus[jj].length; ++ii) {
      this.resampledSamples[jj][ii] = this.avgOriginalSamples[jj][ii];
    }
  }

  this.currentSampleIndex = 0;
  this.currentPosition = []; // samples
  this.leftRegionPosition = []; // samples
  this.rightRegionPosition = []; // samples
  for (var jj = 0; jj < this.stimulus.length; ++jj) {
    this.currentPosition[jj] = 0;
    this.leftRegionPosition[jj] = 0;
    this.rightRegionPosition[jj] = this.resampledSamples[jj][0].length;
  }

    this.numberEventListener = this.mushraAudioControl.addEventListener((function (_event) {
      if (_event.name == 'processUpdate') {
        this.setCurrentPosition(_event.currentSample);
      }

      if (this.enableLooping) {

        if (_event.name == "loopStartChanged" || _event.name == "loopChanged") {
          var startSamples = _event.start;
          if (parseFloat(this.slider.get(0).noUiSlider.get()[0]) != _event.start) {
            this.slider.get(0).noUiSlider.set([startSamples, this.slider.get(0).noUiSlider.get()[1]]);
          }
          var startRegionSamples = this.leftRegionPosition[this.currentCondition];
          this.setLeftRegionPosition(startSamples);
          if (startRegionSamples != this.leftRegionPosition[this.currentCondition]) {
            this.refresh();
          }
        }

        if (_event.name == "loopEndChanged" || _event.name == "loopChanged") {
          var endSamples = _event.end;
          if (parseFloat(this.slider.get(0).noUiSlider.get()[1]) != _event.end) {
            this.slider.get(0).noUiSlider.set([this.slider.get(0).noUiSlider.get()[0], endSamples]);
          }


          var endRegionSamples = this.rightRegionPosition[this.currentCondition];
          this.setRightRegionPosition(endSamples);
          if (endRegionSamples != this.rightRegionPosition[this.currentCondition]) {
            this.refresh();
          }
        }
      }
    }).bind(this));
};

MultiWaveformVisualizer.prototype.translateOrigToResampled = function(_i) {
  return Number.parseInt((this.resampledSamples[this.currentCondition][this.currentSampleIndex].length / this.avgOriginalSamples[this.currentCondition][this.currentSampleIndex].length) * _i);
}

MultiWaveformVisualizer.prototype.resample = function() {
  this.resampledSamples[this.currentCondition] = [];
  if(this.showWaveform == false){

    for (var ii = 0; ii < this.stimulus[this.currentCondition].length; ++ii) {
      this.resampledSamples[this.currentCondition][ii] = [];
      for(var l = 0; l < this.canvas.width; l++){
        this.resampledSamples[this.currentCondition][ii][l] = 0.3;
      }
    }
  }else{
    var blockCount = Math.ceil(this.avgOriginalSamples[this.currentCondition][this.currentSampleIndex].length / this.canvas.width);
    for (var ii = 0; ii < this.stimulus[this.currentCondition].length; ++ii) {
      this.resampledSamples[this.currentCondition][ii] = [];
      var k = 0;
      for(var i = 0; i < this.avgOriginalSamples[this.currentCondition][ii].length; i += blockCount) {
        var sum = 0;
        for(var j = 0; j < blockCount; j++){
          sum += Math.abs(this.avgOriginalSamples[this.currentCondition][ii][j + i]);
        }
        var avg = Math.abs(sum * (1.0/blockCount));
        this.resampledSamples[this.currentCondition][ii][k] = avg;
        k++;
      }
    }
  }
  this.currentPosition[this.currentCondition] = 0; // samples
  this.leftRegionPosition[this.currentCondition] = 0; // samples
  this.rightRegionPosition[this.currentCondition] = this.resampledSamples[this.currentCondition][this.currentSampleIndex].length; // samples
}

MultiWaveformVisualizer.prototype.scaleToHeight = function() {
  var max = 0;
  this.scaledToHeight = 0;
  if(this.showWaveform == false){
    max = this.resampledSamples[this.currentCondition][this.currentSampleIndex][0];
    this.scaledToHeight = this.canvas.height / max;
  }else{

    for(var i = 0; i < this.resampledSamples[this.currentCondition][this.currentSampleIndex].length; i++){
      if(max < this.resampledSamples[this.currentCondition][this.currentSampleIndex][i]){

        max = this.resampledSamples[this.currentCondition][this.currentSampleIndex][i];
      }
    }
    this.scaledToHeight = this.canvas.height / max;
  }
}

MultiWaveformVisualizer.prototype.renderSlider = function() {

  this.parentSlider.append(this.slider);
  $.mobile.activePage.trigger('create');

  noUiSlider.create(this.slider.get(0), {
    connect : true,
    range: {
    'min': 0,
    'max': this.stimulus[this.currentCondition][0].audioBuffer.length
    },
    start: [0, this.stimulus[this.currentCondition][0].audioBuffer.length],
    step: 1,
    margin: this.stimulus[this.currentCondition][0].audioBuffer.sampleRate * 0.25,
  });

  this.slider.get(0).noUiSlider.on('update', (function(values, handle){
    
    var sampleRate = this.stimulus[this.currentCondition][0].audioBuffer.sampleRate;
    var startSliderSeconds = Math.floor(values[0]/sampleRate * 100) / 100;
    var endSliderSeconds = Math.floor(values[1]/sampleRate * 100) / 100;

    $('#lowerLim[name="lowerLim' + this.index + '"').val(startSliderSeconds.toFixed(2));
    $('#upperLim[name="upperLim' + this.index + '"').val(endSliderSeconds.toFixed(2));

    var startSliderSamples = parseInt(values[0]);
    var endSliderSamples = parseInt(values[1]);
    this.mushraAudioControl.setLoop(startSliderSamples, endSliderSamples);

    if(endSliderSamples < this.currentPosition[this.currentCondition]/this.scale){

      this.mushraAudioControl.setPosition(parseInt(this.rightRegionPosition[this.currentCondition]/this.scale))
    }
  }).bind(this)
  );
};

MultiWaveformVisualizer.prototype.renderTable = function() {

  var tr1_ = $("<tr valign='bottom'></tr>");
  this.table.append(tr1_);
  var td11_ = $("<td id='sliderLim'></td>");
  var td12_ = $("<td></td>");
  var td13_ = $("<td id='sliderLim'></td>");
  tr1_.append(td11_);
  tr1_.append(td12_);
  tr1_.append(td13_);

  var tdLoop2 = $(" \
    <td> \
    </td> \
  "); // TODO mschoeff variable size
  tdLoop2.append(this.parentWavesurfer);
  tdLoop2.append(this.parentSlider);

  td12_.append(tdLoop2);
  tdLoop2.css("width",td12_.width().toString());
  var name = "lowerLim" + this.index;
  var lowerLim = $("<div id='div_lower_limit' name='lower_limit" + this.index + "'><input type=\"text\" name=\"" + name + "\" id=\"lowerLim\" class=\"limits\" data-inline=\"true\" data-mini=\"true\"disabled=\"disabled\"></input></div>");
  var name = "upperLim" + this.index;
  var upperLim = $("<div id='div_upper_limit' name='upper_limit" + this.index + "'><input type=\"text\" name=\"" + name + "\" id=\"upperLim\" class=\"limits\" data-inline=\"true\" data-mini=\"true\"disabled=\"disabled\"></input></div>");
  td11_.append(lowerLim);
  td13_.append(upperLim);


};

MultiWaveformVisualizer.prototype.create = function(){

  if(this.enableLooping){
    this.renderTable();
    this.renderSlider();
  }

  this.canvas.style.left = this.parent.get(0).style.left;
  this.canvas.style.top = this.parent.get(0).style.top;
  this.canvas.style.position = "relative";
  this.canvas.style.zIndex = 0;
  this.canvas.setAttribute("id","canvas");
  this.parentWavesurfer.append(this.canvas);
  this.canvas.height = this.parentWavesurfer.height();
  this.canvas.width = this.parentWavesurfer.width();
  this.scale = this.canvas.offsetWidth/this.resampledSamples[this.currentCondition][this.currentSampleIndex].length;
  this.resample();
  this.scaleToHeight();


  this.regionStart = 0; // pixel
  this.regionWidth = this.canvas.offsetWidth; // pixel

  this.canvas.addEventListener('click', (function(event){

    if(event.x != undefined){
      var newRegion = this.calculateRegion(event.x);
    }else{ // for Firefox
      var newRegion = this.calculateRegion(event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft);
    }
    if(this.enableLooping){
       if(this.leftRegionPosition[this.currentCondition] != newRegion.left){
          this.mushraAudioControl.setLoopStart(parseInt(newRegion.left/this.scale));
        }else if(this.rightRegionPosition[this.currentCondition] != newRegion.right){
          this.mushraAudioControl.setLoopEnd(parseInt(newRegion.right/this.scale + newRegion.left / this.scale));
        }
     }else{
       if(this.leftRegionPosition[this.currentCondition] != newRegion.left){
          this.mushraAudioControl.setPosition(parseInt(newRegion.left/this.scale))
        }else if(this.rightRegionPosition[this.currentCondition] != newRegion.right){
          this.mushraAudioControl.setPosition(parseInt(newRegion.right/this.scale + newRegion.left/this.scale))
        }
     }
  }).bind(this));

  this.refresh();

};

MultiWaveformVisualizer.prototype.draw = function(){

  this.context.clearRect ( 0 , 0 , this.canvas.width, this.canvas.height );

  this.context.translate(0, this.canvas.height/2);

  this.context.fillStyle= 'rgba(0, 0, 0, 0.1)';
  this.context.fillRect(this.leftRegionPosition[this.currentCondition], -1 * this.canvas.height/2, (this.rightRegionPosition[this.currentCondition] - this.leftRegionPosition[this.currentCondition]), 2 * this.canvas.height);

  var selected = this.leftRegionPosition[this.currentCondition] > 0 || this.rightRegionPosition[this.currentCondition] < this.resampledSamples[this.currentCondition][this.currentSampleIndex].length;

  var state = 0;
  this.context.beginPath();
  if (selected) {
    this.context.strokeStyle = '#808080';
  } else if(this.currentPosition[this.currentCondition] != 0) {
    state = 0;
  }else {
    this.context.strokeStyle = '#F8DEBD';
    state = 1;
  }

  for(var j = 0; j < this.resampledSamples[this.currentCondition][this.currentSampleIndex].length; j++) {

    if(state == 0 && j >= this.leftRegionPosition[this.currentCondition]){
      // state 1 before current position
      this.context.stroke();
      this.context.beginPath();
      this.context.strokeStyle = '#ED8C01';
      state = 1;
    }else if(state == 1 && j > this.currentPosition[this.currentCondition]){
      // after current position
      this.context.stroke();
      this.context.beginPath();
      this.context.strokeStyle = '#F8DEBD';
      state = 2;
    }else if(state == 2 && j > this.rightRegionPosition[this.currentCondition]){
      this.context.stroke();
      this.context.beginPath();
      this.context.strokeStyle = '#808080';
      state = 3;
    }

    this.context.moveTo(j, -1 * this.resampledSamples[this.currentCondition][this.currentSampleIndex][j] * this.scaledToHeight/2); //this.canvas.height/2
    this.context.lineTo(j,this.resampledSamples[this.currentCondition][this.currentSampleIndex][j] * this.scaledToHeight/2);

  }

  this.context.stroke();
  this.context.translate(0, -this.canvas.height/2);
};


MultiWaveformVisualizer.prototype.refresh = function(){
  this.draw();
};

MultiWaveformVisualizer.prototype.setWidth = function(width){

  this.canvas.width = width;
  this.resample();
  this.scaleToHeight();
  this.refresh();
};

MultiWaveformVisualizer.prototype.setHeight = function(height){

  this.canvas.height = height;
  this.resample();
  this.scaleToHeight();
  this.refresh();
};


MultiWaveformVisualizer.prototype.calculateRegion= function(changingPoint){
    var region = {left: this.leftRegionPosition[this.currentCondition], right: this.rightRegionPosition[this.currentCondition]};
    var offset = changingPoint - (this.canvas.offsetLeft + this.canvas.offsetParent.offsetLeft);
    var center = this.leftRegionPosition[this.currentCondition] + (this.rightRegionPosition[this.currentCondition] - this.leftRegionPosition[this.currentCondition])/2

    if(offset < center){

      region.left = offset;
      region.right = this.rightRegionPosition[this.currentCondition] - this.leftRegionPosition[this.currentCondition];
    }else{

      region.left = this.leftRegionPosition[this.currentCondition];
      region.right = offset - this.leftRegionPosition[this.currentCondition];
    }

    return region;
};

MultiWaveformVisualizer.prototype.setLeftRegionPosition = function(_leftRegionPosition) {
  this.leftRegionPosition[this.currentCondition] = this.translateOrigToResampled(_leftRegionPosition);
};

MultiWaveformVisualizer.prototype.setRightRegionPosition = function(_rightRegionPosition) {
  this.rightRegionPosition[this.currentCondition] = this.translateOrigToResampled(_rightRegionPosition);
};


MultiWaveformVisualizer.prototype.setCurrentPosition = function(_currentPosition) {
  this.currentPosition[this.currentCondition] = this.translateOrigToResampled(_currentPosition);
  if (this.currentPosition[this.currentCondition] < this.leftRegionPosition[this.currentCondition]) {
    this.currentPosition[this.currentCondition] = this.leftRegionPosition[this.currentCondition];
  }
  if (this.currentPosition[this.currentCondition] > this.rightRegionPosition[this.currentCondition]) {
    this.currentPosition[this.currentCondition] = this.rightRegionPosition[this.currentCondition];
  }

  this.draw();

};

MultiWaveformVisualizer.prototype.load = function() {
  $('#upperLim[name="upperLim' + this.index + '"]').parent().css('opacity', '1');
  $('#lowerLim[name="lowerLim' + this.index + '"]').parent().css('opacity', '1');

  $('#div_lower_limit[name="lower_limit' + this.index + '"]').css('opacity', '1');
  $('#div_upper_limit[name="upper_limit' + this.index + '"]').css('opacity', '1');
};


