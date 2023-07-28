function MultiConditionDemoPage(_pageManager, _pageTemplateRenderer, _audioContext, _bufferSize, _audioFileLoader, _session, _pageConfig, _mushraValidator, _errorHandler, _language, _pageCount) {
	this.isMushra = false;
  this.pageManager = _pageManager;
  this.pageTemplateRenderer = _pageTemplateRenderer;
  this.audioContext = _audioContext;
  this.bufferSize = _bufferSize;
  this.audioFileLoader = _audioFileLoader;
  this.session = _session;
  this.pageConfig = _pageConfig;
  this.mushraValidator = _mushraValidator;
  this.errorHandler = _errorHandler;
  this.language = _language
  this.mushraAudioControl = null;
  this.div = null;
  this.waveformVisualizer = null;
  this.macic = null;

  this.currentItem = null;

  this.tdLoop2 = null;

  this.conditions = this.pageConfig.conditions;
  this.contents = {};
  this.conditionColors = {};
  for (var i = 0; i < this.conditions.length; ++i) {
    this.contents[this.conditions[i]] = this.pageConfig.content[i];
    this.conditionColors[this.conditions[i]] = this.pageConfig.colors[i];
  }
  this.conditionColors["__inactive_color__"] = "#F1F1F1";
  this.currentCondition = 0;

  this.sampleRates = [];
  for (var i = 0; i < this.conditions.length; ++i) {
    this.sampleRates[i] = this.pageConfig.sampleRate[i];
  }

  this.samples = [];
  this.specs = [];
  this.transcriptions = [];
  for (var i = 0; i < this.conditions.length; ++i) {
    this.sample_names = [];
    this.samples[this.samples.length] = [];
    for (var key in this.pageConfig.stimuli[i]) {
      this.samples[i][this.samples[i].length] = new Stimulus(key, this.pageConfig.stimuli[i][key]);
      this.sample_names[this.sample_names.length] = key;
    }
    
    for (var ii = 0; ii < this.samples[i].length; ++ii) {
      this.audioFileLoader.addFile(this.samples[i][ii].getFilepath(), (function (_buffer, _stimulus) { _stimulus.setAudioBuffer(_buffer); }), this.samples[i][ii], this.sampleRates[i]);
    }
    
    this.specs[this.specs.length] = [];
    this.transcriptions[this.transcriptions.length] = [];
    for (var key in this.pageConfig.stimuli[i]) {
      this.specs[i][this.specs[i].length] = this.pageConfig.spectrogram[i][key];
      this.transcriptions[i][this.transcriptions[i].length] = this.pageConfig.asr[i][key];
    }
  }

  // data
  this.loop = {start: null, end: null};
  this.slider = {start: null, end: null};

  this.time = 0;
  this.startTimeOnPage = null;

  this.pageCount = _pageCount;

  this.pageTemplateRenderer.unlockNextButton();
}



MultiConditionDemoPage.prototype.getName = function () {
  return this.pageConfig.name;
};

MultiConditionDemoPage.prototype.init = function () {
  var toDisable;
  var active;

  for (var ii = 0; ii < this.conditions.length; ii++) {
    if (this.pageConfig.strict !== false) {
      this.mushraValidator.checkNumConditions(this.samples[ii]);
      this.mushraValidator.checkStimulusDuration(this.samples[ii][0]);
    }
    
    this.mushraValidator.checkNumChannels(this.audioContext[this.sampleRates[ii]], this.samples[ii][0]);
    var i;
    for (i = 1; i < this.samples[ii].length; ++i) {
      this.mushraValidator.checkSamplerate(this.sampleRates[ii], this.samples[ii][i]);
    }
    this.mushraValidator.checkConditionConsistency(this.samples[ii][0], this.samples[ii]);
  }

  this.mushraAudioControl = new MultiConditionDemoAudioControl(this.audioContext, this.bufferSize, this.samples, this.sampleRates, this.errorHandler, this.currentCondition);
  this.mushraAudioControl.addEventListener((function (_event) {
    // var tabs = $(".tablinks");
    // var conditionIndex = 0;
    // for (var idx = 0; idx < tabs.length; idx++) {
    //   if ($(tabs[idx]).hasClass("active")) {
    //     conditionIndex = idx;
    //     break;
    //   }
    // }
  if (_event.name == 'stopTriggered') {
    $(".audioControlElement[name='btnSample" + this.pageManager.headerIndex + "']").text(this.pageManager.getLocalizer().getFragment(this.language, 'playButton'));

    for(i = 0; i < _event.conditionLength; i++) {
      active = '#buttonSamples' + i + '[name="btnSample' + this.pageManager.headerIndex + '"]';
      if($(active).attr("active") == "true") {
        $.mobile.activePage.find(active)      // remove color from samples
        .removeClass('ui-btn-b')
        .addClass('ui-btn-a').attr('data-theme', 'a');
        for (var idx = 0; idx < this.conditions.length; idx++) {
          $(active).attr("active", "false");
        }
        break;
      }
    }

    $.mobile.activePage.find('#buttonStop[name="btnStop' + this.pageManager.headerIndex + '"]')    //add color to stop
      .removeClass('ui-btn-a')
      .addClass('ui-btn-b').attr('data-theme', 'b');
    $.mobile.activePage.find('#buttonStop[name="btnStop' + this.pageManager.headerIndex + '"]').focus();
    $('#buttonStop[name="btnStop' + this.pageManager.headerIndex + '"]').attr("active", "true");

  } else if(_event.name == 'playSampleTriggered') {

    var index = _event.index;
    var selector = '#buttonSamples' + index + '[name="btnSample' + this.pageManager.headerIndex + '"]';

    if($('#buttonStop[name="btnStop' + this.pageManager.headerIndex + '"]').attr("active") == "true") {
      $.mobile.activePage.find('#buttonStop[name="btnStop' + this.pageManager.headerIndex + '"]')  //remove color from Stop
      .removeClass('ui-btn-b')
      .addClass('ui-btn-a').attr('data-theme', 'a');
	    $('#buttonStop[name="btnStop' + this.pageManager.headerIndex + '"]').attr("active", "false");
    }

    var k;
    for(k = 0; k < _event.length; k++) {
      active = '#buttonSamples' + k + '[name="btnSample' + this.pageManager.headerIndex + '"]';
      if($(active).attr("active") == "true") {
        $.mobile.activePage.find(active)    // remove color from samples
        .removeClass('ui-btn-b')
        .addClass('ui-btn-a').attr('data-theme', 'a');
        for (var idx = 0; idx < this.conditions.length; idx++) {
          $(active).attr("active", "false");
        }
  	    break;
      }
    }

    $.mobile.activePage.find(selector)    //add color to samples
      .removeClass('ui-btn-a')
      .addClass('ui-btn-b').attr('data-theme', 'b');
    $.mobile.activePage.find(selector).focus();
    $(selector).attr("active", "true");
  }

}).bind(this));

};

MultiConditionDemoPage.prototype.bind = function () {
  this.macic.bind();
  // Bind keys '[' and ']' for navigating between tabs
  Mousetrap.bind(['[', '【'], () => {
    var tabs = $(".tablinks[name='" + this.pageManager.headerIndex + "']");
    const tabsRect = tabs[0].getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // Check if the tabs are out of the screen vertically
    if (tabsRect.bottom > viewportHeight || tabsRect.top < 0) {
      $("#page_header" + this.pageManager.headerIndex)[0].scrollIntoView();
    }

    for (var idx = 0; idx < tabs.length; idx++) {
      if ($(tabs[idx]).hasClass("active")) {
        break;
      }
    }
    // mod(idx - 1, tabs.length)
    next_idx = (idx - 1) - tabs.length * Math.floor((idx - 1)/tabs.length);
    tabs[next_idx].click();
  });
  Mousetrap.bind([']', '】'], () => {
    var tabs = $(".tablinks[name='" + this.pageManager.headerIndex + "']");
    const tabsRect = tabs[0].getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // Check if the tabs are out of the screen vertically
    if (tabsRect.bottom > viewportHeight || tabsRect.top < 0) {
      $("#page_header" + this.pageManager.headerIndex)[0].scrollIntoView();
    }

    for (var idx = 0; idx < tabs.length; idx++) {
      if ($(tabs[idx]).hasClass("active")) {
        break;
      }
    }
    // mod(idx - 1, tabs.length)
    next_idx = (idx + 1) - tabs.length * Math.floor((idx + 1)/tabs.length);
    tabs[next_idx].click();
  });
}


MultiConditionDemoPage.prototype.render = function (_parent) {
  var div = $("<div></div>");
  _parent.append(div);

  var tabs = $("<div class='tab'></div>");
  div.append(tabs);

  var p;
  for (var key in this.contents) {
    p = $("<div class='tablinks' name='" + this.pageManager.headerIndex + "'>" + key + "</div>");
    p[0].onclick = this.switchTab.bind(this);
    tabs.append(p);
  }

  // Event listener for focusing on the element
  document.getElementById(_parent[0].id).addEventListener('focus', () => { this.bind(); });

  // Event listener for blurring (losing focus) on the element
  document.getElementById(_parent[0].id).addEventListener('blur', () => {
    Mousetrap.unbind(['[', '【']);
    Mousetrap.unbind([']', '】']);
  });


  var note = $("<div style='display:inline-flex; overflow-x: auto; height: 50px;'><p>" + this.pageManager.getLocalizer().getFragment(this.language, 'switchTab') + " <font color='gray'>(" + this.pageManager.getLocalizer().getFragment(this.language, 'shortcutCheatsheet') + ")</font></p></div>");
  div.append(note);

  var content;
  var disp = "block";
  for (var key in this.contents) {
    if(this.contents[key] === null){
      content ="";
    } else {
      content = this.contents[key];
    }
    p = $("<div id='" + key +"' class='tabcontent' name='" + this.pageManager.headerIndex + "' style='display: " + disp + "'>" + content + "</div>");
    div.append(p);
    disp = "none";
  }

  var tableUp = $("<table id='mainUp'></table>");
  var tableDown = $("<table id='mainDown' align = 'center'></table>");
  div.append(tableUp);
  div.append(tableDown);

  var trLoop = $("<tr id='trWs'></tr>");
  tableUp.append(trLoop);

  var tdLoop1 = $(" \
    <td class='stopButton'> \
      <button data-role='button' data-inline='true' id='buttonStop' name='btnStop" + this.pageManager.headerIndex + "' onclick='"+ this.pageManager.getPageVariableName(this) + ".mushraAudioControl.stop();'>" + this.pageManager.getLocalizer().getFragment(this.language, 'stopButton') + "</button> \
    </td> \
  ");
  trLoop.append(tdLoop1);



  var tdRight = $("<td></td>");
  trLoop.append(tdRight);


  var trMushra = $("<tr></tr>");
  tableDown.append(trMushra);
  var tdMushra = $("<td id='td_Mushra' colspan='2'></td>");
  trMushra.append(tdMushra);

  var tableMushra = $("<table id='mushra_items'></table>");
  tdMushra.append(tableMushra);

  var trSampleNames = $("<tr></tr>");
  tableMushra.append(trSampleNames);

  var samples = this.mushraAudioControl.getSamples();
  var i;
  for (i = 0; i < samples.length; ++i) {
    var str = "<span style='text-align: center; font-family: Menlo; color: blue;'>" + samples[i].id + "</span>";
    // td = $("<td>[" + this.pageManager.getLocalizer().getFragment(this.language, 'sample') + " " + (i + 1) + "]" + str + "</td>");
    td = $("<td>[" + (i + 1) + "] " + str + "</td>");
    trSampleNames.append(td);
  }

  var trSamplePlay = $("<tr></tr>");
  tableMushra.append(trSamplePlay);

  for (i = 0; i < samples.length; ++i) {
    td = $("<td></td>");
    var buttonPlay = $("<button data-role='button' class='center audioControlElement' onclick='" + this.pageManager.getPageVariableName(this) + ".btnCallbackCondition(" + i + ");'>" + this.pageManager.getLocalizer().getFragment(this.language, 'playButton') + "</button>");
    buttonPlay.attr("id", "buttonSamples" + i);
    buttonPlay.attr("name", "btnSample" + this.pageManager.headerIndex);
    td.append(buttonPlay);
    trSamplePlay.append(td);
    // (function(i) {
        // Mousetrap.bind(String(i + 1), function() { this.pageManager.getCurrentPage().btnCallbackCondition(i); });
    // })(i);
  }

  this.macic = new MultiConditionDemoAudioControlInputController(this.pageManager, this.mushraAudioControl, this.pageConfig.enableLooping, this.pageManager.headerIndex);
  this.macic.bind();

this.waveformVisualizer = new MultiWaveformVisualizer(this.pageManager.getPageVariableName(this) + ".waveformVisualizer", tdRight, this.samples, this.pageConfig.showWaveform, this.pageConfig.enableLooping, this.mushraAudioControl, this.pageManager.headerIndex, this.currentCondition);
  this.waveformVisualizer.create();
  this.waveformVisualizer.load();

  // spectrum
  var trSampleSpectrum = $("<tr></tr>");
  tableMushra.append(trSampleSpectrum);

  for (var i = 0; i < this.samples[0].length; ++i) {
    td = $("<td></td>");
    for (var ii = 0; ii < this.samples.length; ii++) {
      // https://stackoverflow.com/a/12222956
      var sampleSpectrum = $("<img id='spectrogram' name='spec" + ii + "-" + i + "' src='" + this.specs[ii][i] + "' style='max-height: 100%; max-width: 100%'/>");
      sampleSpectrum[0].width = parseInt($("#page_content" + this.pageManager.headerIndex)[0].offsetWidth / this.samples[0].length * 0.9);
      td.append(sampleSpectrum);
      if (ii != this.currentCondition) {
        sampleSpectrum.hide();
      }
    }
    trSampleSpectrum.append(td);
  }

  // transcription
  var trSampleTranscription = $("<tr></tr>");
  tableMushra.append(trSampleTranscription);
  for (var i = 0; i < this.samples[0].length; ++i) {
    td = $("<td align='left'></td>");
    for (var ii = 0; ii < this.samples.length; ii++) {
      var str = "<span id='transcript' name='asr" + ii + "-" + i + "' style='text-align: justify; font-family: Menlo; padding:10px;'>" + this.transcriptions[ii][i] + "</span>"
      var sampleTranscription = $("<p style='text-align: center; font-family: Menlo;'>[ASR transcript]</p>" + str);
      td.append(sampleTranscription);
      if (ii != this.currentCondition) {
        sampleTranscription.hide();
      }
    }
    trSampleTranscription.append(td);
  }
};


MultiConditionDemoPage.prototype.pause = function() {
  this.mushraAudioControl.pause();
};

MultiConditionDemoPage.prototype.setLoopStart = function() {
  var slider = $('#slider[name="slider' + this.pageManager.headerIndex + '"]')[0];
  var startSliderSamples = this.mushraAudioControl.audioCurrentPosition[this.mushraAudioControl.currentCondition];

  var endSliderSamples = parseFloat(slider.noUiSlider.get()[1]);

  this.mushraAudioControl.setLoop(startSliderSamples, endSliderSamples);
};

MultiConditionDemoPage.prototype.setLoopEnd = function() {
  var slider = $('#slider[name="slider' + this.pageManager.headerIndex + '"]')[0];
  var startSliderSamples = parseFloat(slider.noUiSlider.get()[0]);

  var endSliderSamples = this.mushraAudioControl.audioCurrentPosition[this.mushraAudioControl.currentCondition];

  this.mushraAudioControl.setLoop(startSliderSamples, endSliderSamples);
};

MultiConditionDemoPage.prototype.btnCallbackCondition = function(_index) {
	this.currentItem = _index;
  var name = '[name="btnSample' + this.pageManager.headerIndex + '"]';

  var label = $("#buttonSamples" + _index + name).text();
  if (label == this.pageManager.getLocalizer().getFragment(this.language, 'pauseButton')) {
    this.mushraAudioControl.pause();
    $("#buttonSamples" + _index + name).text(this.pageManager.getLocalizer().getFragment(this.language, 'playButton'));
  } else if (label == this.pageManager.getLocalizer().getFragment(this.language, 'playButton')) {
    $(".audioControlElement" + name).text(this.pageManager.getLocalizer().getFragment(this.language, 'playButton'));
    this.mushraAudioControl.playSample(_index);
    $("#buttonSamples" + _index + name).text(this.pageManager.getLocalizer().getFragment(this.language, 'pauseButton'));
    this.waveformVisualizer.currentSampleIndex = _index;
    this.waveformVisualizer.scaleToHeight();
    this.waveformVisualizer.refresh();
  }
  this.bind();
};

MultiConditionDemoPage.prototype.load = function () {
  // Replace the page number in the page title with the correct one,
  // because the page order might be randomized
  this.startTimeOnPage = new Date();
	$("#page_header" + this.pageManager.headerIndex)[0].textContent = $("#page_header" + this.pageManager.headerIndex)[0].textContent.replace(
    /\((\d+)\/(\d+)\)/, "(" + this.pageCount + "/$2)"
  );

  this.conditionColors["__inactive_color__"] = $(".tablinks[name='" + this.pageManager.headerIndex + "']")[0].style.backgroundColor;
  $(".tablinks[name='" + this.pageManager.headerIndex + "']")[0].click();


  this.mushraAudioControl.initAudio();

  if (this.loop.start !== null && this.loop.end !== null) {
    this.mushraAudioControl.setLoop(0, 0, this.mushraAudioControl.getDuration(), this.mushraAudioControl.getDuration() /this.sampleRates[this.currentCondition]);
    this.mushraAudioControl.setPosition(0);
  }

  Mousetrap.bind(['/'], this.popupShortcuts.bind(this));
};


MultiConditionDemoPage.prototype.switchTab = function (event) {
  var conditionName = event.target.textContent;
  var active_color = this.conditionColors[conditionName];
  var inactive_color = this.conditionColors["__inactive_color__"];
  var i, tabcontent;
  var tablinks = $(".tablinks[name='" + this.pageManager.headerIndex + "']");
  for (i = 0; i < tablinks.length; i++) {
    if (tablinks[i].textContent === conditionName) {
      this.currentCondition = i;
      $(tablinks[i]).addClass("active");
      tablinks[i].style.backgroundColor = active_color;
    } else {
      $(tablinks[i]).removeClass("active");
      tablinks[i].style.backgroundColor = inactive_color;
    }
  }

  tabcontent = $(".tabcontent[name='" + this.pageManager.headerIndex + "']");
  for (i = 0; i < tabcontent.length; i++) {
    if (tabcontent[i].id === conditionName) {
      tabcontent[i].style.display = "block";
    } else {
      tabcontent[i].style.display = "none";
    }
  }

  this.mushraAudioControl.currentCondition = this.currentCondition;
  if (this.mushraAudioControl.dummyBufferSource != null) {
    var resumePlaying = this.mushraAudioControl.audioPlaying;
    this.mushraAudioControl.freeAudio();
    this.mushraAudioControl.initAudio();
    var event = {
      name: 'playSampleTriggered',
      index : this.currentItem,
      length : this.mushraAudioControl.samples[this.currentCondition].length
    };
    this.mushraAudioControl.sendEvent(event);
    if (resumePlaying) {
      $("#buttonSamples" + this.currentItem + "[name='btnSample" + this.pageManager.headerIndex + "']").click();
    }
  }
  this.waveformVisualizer.currentCondition = this.currentCondition;
  this.waveformVisualizer.resample();
  this.waveformVisualizer.scaleToHeight();
  this.waveformVisualizer.refresh();
  this.waveformVisualizer.slider.get(0).noUiSlider.updateOptions({
    range: {
      'min': 0,
      'max': this.waveformVisualizer.stimulus[this.currentCondition][0].audioBuffer.length
      },
      start: [0, this.waveformVisualizer.stimulus[this.currentCondition][0].audioBuffer.length],
      margin: this.waveformVisualizer.stimulus[this.currentCondition][0].audioBuffer.sampleRate * 0.25,
  });
  for (var ii = 0; ii < tablinks.length; ii++) {
    if (ii === this.currentCondition) {
      for (i = 0; i < this.samples[ii].length; ++i) {
        $("#spectrogram[name='spec" + ii + "-" + i + "'").show();
        $("#transcript[name='asr" + ii + "-" + i + "'").show();
      }
    } else {
      for (i = 0; i < this.samples[ii].length; ++i) {
        $("#spectrogram[name='spec" + ii + "-" + i + "'").hide();
        $("#transcript[name='asr" + ii + "-" + i + "'").hide();
      }
    }
  }
  this.bind();
}


MultiConditionDemoPage.prototype.popupShortcuts = function () {
  if ($("#shortcutsPopupCard-popup").hasClass("ui-popup-active")) {
    $("#shortcutsPopupCard").popup("close");
    $("#shortcutsPopupCard").addClass("ui-disabled");
  } else {
    $("#shortcutsPopupCard").removeClass("ui-disabled");

    $("#shortcutsPopHeader").text(this.pageManager.getLocalizer().getFragment(this.language, 'shortcutPopupTitle'));
    $("#popupShortcuts").empty();

    var table = $("<table align='center' style='border-spacing: 50px 0;'> </table>");
    var trHeader = document.createElement("tr");
    $(table).append(trHeader);
    $(trHeader).append($("<th style='text-align: left'>" + this.pageManager.getLocalizer().getFragment(this.language, 'shortcutPopupHeader') + "</th>"));
    $(trHeader).append($("<th style='text-align: left'>" + this.pageManager.getLocalizer().getFragment(this.language, 'shortcutPopupHeaderDoc') + "</th>"));
    // Empty row
    $(table).append($("<tr height='16px'></tr>"));

    var tabs = $(".tablinks[name='" + this.pageManager.headerIndex + "']");
    var prevConditionIndex = 0;
    var nextConditionIndex = 1;
    for (var idx = 0; idx < tabs.length; idx++) {
      if ($(tabs[idx]).hasClass("active")) {
        prevConditionIndex = (idx - 1) - tabs.length * Math.floor((idx - 1)/tabs.length);
        nextConditionIndex = (idx + 1) - tabs.length * Math.floor((idx + 1)/tabs.length);
        break;
      }
    }

    var trT;
    var shortcuts = [
      "shortcut_Num_Key",
      // "shortcut_r_0_Key",
      "shortcut_Space_Key",
      "shortcut_Enter_Key",
      "shortcut_Backspace_Key",
      "shortcut_j_Key",
      "shortcut_k_Key",
      "shortcut_[_Key",
      "shortcut_]_Key",
      "shortcut_a_A_Key",
      "shortcut_b_B_Key",
    ];
    for (var i = 0; i < shortcuts.length; i++) {
      trT = document.createElement("tr");
      $(trT).append($("<td style='text-align: left; font-family: Menlo; color: blue;'>" + this.pageManager.getLocalizer().getFragment(this.language, shortcuts[i]) + "</td>"));
      if (shortcuts[i] === "shortcut_[_Key") {
        $(trT).append($("<td style='text-align: left'>" + this.pageManager.getLocalizer().getFragment(this.language, shortcuts[i] + "Doc") + "</td>"));
      } else if (shortcuts[i] === "shortcut_]_Key") {
        $(trT).append($("<td style='text-align: left'>" + this.pageManager.getLocalizer().getFragment(this.language, shortcuts[i] + "Doc") + "</td>"));
      } else {
        $(trT).append($("<td style='text-align: left'>" + this.pageManager.getLocalizer().getFragment(this.language, shortcuts[i] + "Doc") + "</td>"));
      }
      $(table).append(trT);
      // Empty row
      $(table).append($("<tr height='8px'></tr>"));
    }

    $("#popupShortcuts").append(table);
    $("#shortcutsPopupCard").popup("open");
  }
}
