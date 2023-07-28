/*************************************************************************
         (C) Copyright AudioLabs 2017

This source code is protected by copyright law and international treaties. This source code is made available to You subject to the terms and conditions of the Software License for the webMUSHRA.js Software. Said terms and conditions have been made available to You prior to Your download of this source code. By downloading this source code You agree to be bound by the above mentionend terms and conditions, which can also be found here: https://www.audiolabs-erlangen.de/resources/webMUSHRA. Any unauthorised use of this source code may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.

**************************************************************************/

function checkOrientation() {//when changing from potrait to landscape change to the rigth width

  var siteWidth = document.body.scrollWidth;
  $("#header").css("width", siteWidth.toString());

}

window.onresize = function(event) {
  checkOrientation();
};

// $(document).ready(function(){
// $(window).scroll(function(){
// $('#header').css({
// 'left': $(this).scrollLeft()//Note commented because it causes the endless scrolling to the left
// });
// });
// });


// callbacks
function callbackFilesLoaded() {
  for (var i = 0; i < pageManagers.length; ++i) {
    pageManagers[i].restart();
    pageTemplateRenderer[i].renderHeader(("page_header" + (i + 1)));
  }

  if (config.stopOnErrors == false || !errorHandler.errorOccurred()) {
    $.mobile.loading("hide");
    $("body").children().children().removeClass('ui-disabled');
  } else {
    var errors = errorHandler.getErrors();
    var ul = $("<ul style='text-align:left;'></ul>");
    $('#popupErrorsContent').append(ul);
    for (var i = 0; i < errors.length; ++i) {
      ul.append($('<li>' + errors[i] + '</li>'));
    }
    $("#popupErrors").popup("open");
    $.mobile.loading("hide");
  }

  if ($.mobile.activePage) {
    $.mobile.activePage.trigger('create');
  }
  // Focus on the first sample button in the first example page
  pageManagers[0].getCurrentPage().bind();
  var selector = '#buttonSamples0' + '[name="btnSample' + pageManagers[0].headerIndex + '"]';
  $.mobile.activePage.find(selector).focus();
  $(selector).attr("active", "true");
}

function callbackURLFound() {
  var errors = errorHandler.getErrors();
  var ul = $("<ul style='text-align:left;'></ul>");
  $('#popupErrorsContent').append(ul);
  for (var i = 0; i < errors.length; ++i) {
    ul.append($('<li>' + errors[i] + '</li>'));
  }
  $("#popupErrors").popup("open");
}

function addPageToPageManager(_pageManager, _page, _pageTemplateRenderer) {
  var pageCount = 0;

  var pageConfig = _page;
  if (pageConfig.type == "generic") {
    _pageManager.addPage(new GenericPage(_pageManager, pageConfig));
  } else if (pageConfig.type == "volume") {
    var volumePage = new VolumePage(_pageManager, audioContext, audioFileLoader, pageConfig, config.bufferSize, errorHandler, config.language);
    _pageManager.addPage(volumePage);
  } else if (pageConfig.type == "mushra") {
    pageCount++;
    var mushraPage = new MushraPage(_pageManager, audioContext, config.bufferSize, audioFileLoader, session, pageConfig, mushraValidator, errorHandler, config.language);
    _pageManager.addPage(mushraPage);
  } else if (pageConfig.type == "multi_metric_mushra") {
    pageCount++;
    var multiMetricMushraPage = new MultiMetricMushraPage(_pageManager, _pageTemplateRenderer, audioContext, config.bufferSize, audioFileLoader, session, pageConfig, mushraValidator, errorHandler, config.language, pageCount);
    _pageManager.addPage(multiMetricMushraPage);
  } else if (pageConfig.type == "multi_condition_demo") {
    pageCount++;
    var multiConditionDemoPage = new MultiConditionDemoPage(_pageManager, _pageTemplateRenderer, audioContext, config.bufferSize, audioFileLoader, session, pageConfig, mushraValidator, errorHandler, config.language, pageCount);
    _pageManager.addPage(multiConditionDemoPage);
  } else if ( pageConfig.type == "spatial"){
    pageCount++;
    _pageManager.addPage(new SpatialPage(_pageManager, pageConfig, session, audioContext, config.bufferSize, audioFileLoader, errorHandler, config.language));
  } else if (pageConfig.type == "paired_comparison") {
    pageCount++;
    var pcPageManager = new PairedComparisonPageManager();
    pcPageManager.createPages(_pageManager, _pageTemplateRenderer, pageConfig, audioContext, config.bufferSize, audioFileLoader, session, errorHandler, config.language);
    pcPageManager = null;
  } else if (pageConfig.type == "bs1116") {
    pageCount++;
    var bs1116PageManager = new BS1116PageManager();
    bs1116PageManager.createPages(_pageManager, _pageTemplateRenderer, pageConfig, audioContext, config.bufferSize, audioFileLoader, session, errorHandler, config.language);
    bs1116PageManager = null;
  } else if (pageConfig.type == "likert_single_stimulus") {
    pageCount++;
    var likertSingleStimulusPageManager = new LikertSingleStimulusPageManager();
    likertSingleStimulusPageManager.createPages(_pageManager, _pageTemplateRenderer, pageConfig, audioContext, config.bufferSize, audioFileLoader, session, errorHandler, config.language);
    likertSingleStimulusPageManager = null;
  } else if (pageConfig.type == "likert_multi_stimulus") {
    pageCount++;
    var likertMultiStimulusPage = new LikertMultiStimulusPage(pageManager, _pageTemplateRenderer, pageConfig, audioContext, config.bufferSize, audioFileLoader, session, errorHandler, config.language);
    _pageManager.addPage(likertMultiStimulusPage);
  } else if (pageConfig.type == "finish") {
    var finishPage = new FinishPage(_pageManager, session, dataSender, pageConfig, config.language);
    _pageManager.addPage(finishPage);
  } else {
    errorHandler.sendError("Type not specified.");
  }
}

for (var i = 0; i < $("body").children().length; i++) {
  if ($("body").children().eq(i).attr('id') != "popupErrors" && $("body").children().eq(i).attr('id') != "popupDialog") {
    $("body").children().eq(i).addClass('ui-disabled');
  }
}




function startup(config) {


  if (config == null) {
    errorHandler.sendError("URL couldn't be found!");
    callbackURLFound();
  }

  $.mobile.page.prototype.options.theme = 'a';
  var interval = setInterval(function() {
    $.mobile.loading("show", {
      text : "Loading... (This may take some time)",
      textVisible : true,
      theme : "a",
      html : ""
    });
    clearInterval(interval);
  }, 1);
  
  
  if (pageManagers !== null) { // clear everything for new experiment
    for (var i = 0; i < pageTemplateRenderer.length; ++i) {
      pageTemplateRenderer[i].clear();
    }
    $("#pages").empty();
    $('#header').empty();
  }

  localizer = new Localizer();
  localizer.initializeNLSFragments(nls);

  pageManagers = [];
  audioContext = {};
  audioFileLoader = null;
  mushraValidator = null;
  dataSender = null;
  session = null;
  pageTemplateRenderer = [];
  interval2 = null;

  document.title = config.testname;
  $('#header').append(document.createTextNode(config.testname));

  config.pages = config.pages[0];
  var pageContainer = $("#pages");
  for (var i = 0; i < config.pages.length; ++i) {
    var name = "page_header" + (i + 1);
    pageContainer.append($('<h3 class="ui-bar ui-bar-a ui-corner-all" id="' + name + '"></h3>'));
    var name = "page_content" + (i + 1);
    // Use tabindex to make the each page focusable
    pageContainer.append($('<div class="ui-body ui-body-a ui-corner-all" tabindex="0" id="' + name + '"></div>'));
    pageManagers[pageManagers.length] = new PageManager("pageManagers[" + i + "]", name, localizer);
    pageManagers[i].headerIndex = i + 1;
  }
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  keys = [16000, 48000];
  for (var i = 0; i < keys.length; i++) {
    if ( typeof AudioContext !== 'undefined') {
      audioContext[keys[i]] = new AudioContext({sampleRate: keys[i]});
    } else if ( typeof webkitAudioContext !== 'undefined') {
      audioContext[keys[i]] = new webkitAudioContext();
    }
  }

  // for handling the error: The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.
  document.addEventListener("click", function () {
    for (var key in audioContext) {
      if (audioContext[key].state !== 'running') {
        audioContext[key].resume();
      }
    }
  }, true);

  try {
    for (var key in audioContext) {
      audioContext[key].destination.channelCountMode = "explicit";
      audioContext[key].destination.channelInterpretation = "discrete";
      audioContext[key].destination.channelCount = audioContext[key].destination.maxChannelCount;
    }
  } catch (e) {
    console.log("webMUSHRA: Could not set channel count of destination node.");
    console.log(e);
  }
  for (var key in audioContext) {
    audioContext[key].volume = 1.0;
  }

  audioFileLoader = new MultiAudioFileLoader(audioContext, errorHandler);
  mushraValidator = new MushraValidator(errorHandler);
  dataSender = new DataSender(config);

  session = new Session();
  session.testId = config.testId;
  session.config = configFile;

  if (config.language == undefined) {
    config.language = 'en';
  }
  for (var i = 0; i < config.pages.length; ++i) {
    pageTemplateRenderer[pageTemplateRenderer.length] = new PageTemplateRenderer(pageManagers[i], config.showButtonPreviousPage, config.language);
    pageManagers[i].addCallbackPageEventChanged(pageTemplateRenderer[i].refresh.bind(pageTemplateRenderer[i]));
    
    addPageToPageManager(pageManagers[i], config.pages[i], pageTemplateRenderer[i]);
  }

  interval2 = setInterval(function() {
    clearInterval(interval2);
    audioFileLoader.startLoading(callbackFilesLoaded);
  }, 10);
}

// start code (loads config) 

function getParameterByName(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var config = null;
var configArg = getParameterByName("config");
var configFile = '';
if (configArg) {
  configFile = 'configs/' + configArg;
} else {
  configFile = 'configs/default.yaml';
}


// global variables
var errorHandler = new ErrorHandler();
var localizer = null;
var pageManagers = null;
var audioContext = null;
var audioFileLoader = null;
var mushraValidator = null;
var dataSender = null;
var session = null;
var pageTemplateRenderer = null;
var interval2 = null;


YAML.load(configFile, (function(result) {
  config = result;
  startup(result);
}));
