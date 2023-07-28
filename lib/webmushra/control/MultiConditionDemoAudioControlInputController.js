/*************************************************************************
         (C) Copyright AudioLabs 2017

This source code is protected by copyright law and international treaties. This source code is made available to You subject to the terms and samples of the Software License for the webMUSHRA.js Software. Said terms and conditions have been made available to You prior to Your download of this source code. By downloading this source code You agree to be bound by the above mentionend terms and conditions, which can also be found here: https://www.audiolabs-erlangen.de/resources/webMUSHRA. Any unauthorised use of this source code may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.

**************************************************************************/

function MultiConditionDemoAudioControlInputController(_pageManager, _mushraAudioControl, _looping, _index){
    this.pageManager = _pageManager;
    this.mushraAudioControl = _mushraAudioControl;
    this.looping = _looping;
    this.index = _index;
}


MultiConditionDemoAudioControlInputController.prototype.bind = function(){

  var samples = this.mushraAudioControl.getSamples();
  Mousetrap.bind(['r', '0'], function() { $('#buttonReference').click(); });
  Mousetrap.bind(['backspace'], (function() {
    $('#buttonStop' + '[name="btnStop' + this.index + '"]').click();
  }).bind(this));
  Mousetrap.bind(['space'], (function() {   var firstPageCall = false;
    var name = '[name="btnSample' + this.index + '"]';
    for(var j = 0; j < samples.length; j++){
                                              if($('#buttonSamples' + j + name).attr('active') == 'true'){
                                                if(this.mushraAudioControl.audioPlaying != true){
                                                  this.mushraAudioControl.setPosition(this.mushraAudioControl.audioLoopStart[this.mushraAudioControl.currentCondition]);
                                                }
                                                $('#buttonSamples' + j + name).click();
                                                firstPageCall = false;
                                                break;
                                              }else if($('#buttonReference').attr('active') == 'true'){
                                                if(this.mushraAudioControl.audioPlaying != true){
                                                  this.mushraAudioControl.setPosition(this.mushraAudioControl.audioLoopStart[this.mushraAudioControl.currentCondition]);
                                                }
                                                $('#buttonReference').click();
                                                firstPageCall = false;
                                                break;
                                              }else{
                                                firstPageCall = true;
                                              }
                                            }
                                            if(firstPageCall == true){
                                              $('#buttonReference').click();
                                            }
  }).bind(this));

  var duration = this.mushraAudioControl.getDuration();
  if (this.looping) {
    Mousetrap.bind(['a'], (function() { this.pageManager.getCurrentPage().setLoopStart(); }).bind(this));
    Mousetrap.bind(['b'], (function() { this.pageManager.getCurrentPage().setLoopEnd(); }).bind(this));
    Mousetrap.bind(['B'], (function() { this.mushraAudioControl.setLoopEnd(duration); }).bind(this));
    Mousetrap.bind(['A'], (function() { this.mushraAudioControl.setLoopStart(0); }).bind(this));
  }

  for (i = 0; i < samples.length; ++i) {
    (function(i, index) {
        Mousetrap.bind(String(i + 1), () => {
          $('#buttonSamples' + i + '[name="btnSample' + index + '"]').click();
        });
        Mousetrap.bind(['j'], function() {
                         var name = '[name="btnSample' + index + '"]';
                         if($('#buttonReference').attr('active') == 'true'){
                            $('#buttonSamples0' + name).click();
                          }else if($('#buttonSamples' + (samples.length - 1) + name).attr('active') == 'true'){
                            $('#buttonReference').click();
                          }else{
                            for(var k = 0; k < samples.length - 1; ++k){
                              if($('#buttonSamples' + k + name).attr('active') == 'true'){
                                var next = k + 1;
                                $('#buttonSamples' + next + name).click();
                                break;
                              }
                            }
                          }
        });
        Mousetrap.bind(['k'], function() {
                          var name = '[name="btnSample' + index + '"]';
                          if($('#buttonReference').attr('active') == 'true'){
                            $('#buttonSamples' + (samples.length - 1) + name).click();
                          }else if($('#buttonSamples0' + name).attr('active') == 'true'){
                            $('#buttonReference').click();
                          }else{
                            for(var l = 1; l < samples.length; ++l){
                              if($('#buttonSamples' + l + name).attr('active') == 'true'){
                                var previous = l - 1;
                                $('#buttonSamples' + previous + name).click();
                                break;
                              }
                            }
                          }
        });
    })(i, this.index);
  }

  document.onkeydown = function (event) {

    if (!event) { /* This will happen in IE */
      event = window.event;
    }

    var keyCode = event.keyCode;

    if (keyCode == 8 && // prevents backspace to go back
      ((event.target || event.srcElement).tagName != "TEXTAREA") &&
      ((event.target || event.srcElement).tagName != "INPUT")) {

      if (navigator.userAgent.toLowerCase().indexOf("msie") == -1) {
        event.stopPropagation();
      } else {
        alert("prevented");
        event.returnValue = false;
      }

      return false;
    } else if (keyCode == 32 && // prevents space bar to scroll down
      ((event.target || event.srcElement).tagName != "TEXTAREA") &&
      ((event.target || event.srcElement).tagName != "INPUT")) {

        if (navigator.userAgent.toLowerCase().indexOf("msie") == -1) {
          event.stopPropagation();
        } else {
          alert("prevented");
          event.returnValue = false;
        }

        return false;
      }
  };

};


MultiConditionDemoAudioControlInputController.prototype.unbind = function(){
  Mousetrap.unbind(['r', '0', 'a', 'b', 'A', 'B', 'backspace', 'space', 'j', 'k']);
  var samples = this.mushraAudioControl.getSamples();
  for (i = 0; i < samples.length; ++i) {
      Mousetrap.unbind(String(i + 1));
  }
};
