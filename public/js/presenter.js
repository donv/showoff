// presenter js
var w = null;

$(document).ready(function(){
  // attempt to open another window for the presentation. This may fail if
  // popup blockers are enabled. In that case, the presenter needs to manually
  // open the window by hitting the 'slave window' button.
  openSlave();

  // side menu accordian crap
	$("#preso").bind("showoff:loaded", function (event) {
		$(".menu > ul ul").hide()
		$(".menu > ul a").click(function() {
			if ($(this).next().is('ul')) {
				$(this).next().toggle()
			} else {
				gotoSlide($(this).attr('rel'))
				try { w.gotoSlide($(this).attr('rel')) } catch (e) {}
				postSlide()
			}
			return false
		}).next().hide()
	});

  $("#minStop").hide()
  $("#startTimer").click(function() { toggleTimer() })
  $("#stopTimer").click(function() { toggleTimer() })

  /* zoom slide to match preview size, then set up resize handler. */
  zoom();
  $(window).resize(function() { zoom(); });

  // set up tooltips
  $('#slaveWindow').tipsy({ offset: 5 });
  $('#generatePDF').tipsy({ offset: 5 });
  $('#onePage').tipsy({ offset: 5, gravity: 'ne' });

  $('#stats').tipsy({ html: true, trigger: 'manual', gravity: 'ne', opacity: 0.9, offset: 5 });
  $('#downloads').tipsy({ html: true, trigger: 'manual', gravity: 'ne', opacity: 0.9, offset: 5 });

  $('#stats').click( function(e) {  popupLoader( $(this), '/stats', 'stats', e); });
  $('#downloads').click( function(e) {  popupLoader( $(this), '/download', 'downloads', e); });

  $('#enableRemote').tipsy();

  // Bind events for mobile viewing
  $('#preso').unbind('tap').unbind('swipeleft').unbind('swiperight');

  $('#preso').addSwipeEvents().
    bind('tap', presNextStep).        // next
    bind('swipeleft', presNextStep).  // next
    bind('swiperight', presPrevStep); // prev

  // start the timeout.
	resetTimer();

	$('#topbar #update').click( function(e) {
		e.preventDefault();
		$.get("/getpage", function(data) {
      presGotoSlide(data);
		});
	});

});

function popupLoader(elem, page, id, event)
{
  event.preventDefault();

  if(elem.attr('open') == 'true') {
    elem.attr('open', false)
    elem.tipsy("hide");
  }
  else {
    $.get(page, function(data) {
      var content = '<div id="' + id + '">' + $(data).find('#wrapper').html() + '</div>';

      console.log(content);

      elem.attr('title', content);
      elem.attr('open', true)
      elem.tipsy("show");
      setupStats();
    });
  }

  return false;
}

function openSlave()
{
  try {
    if(w == null || typeof(w) == 'undefined' || w.closed){
        w = window.open('/?ping=false' + window.location.hash);
    } else {
      // maybe we need to reset content?
      w.location.href = '/?ping=false' + window.location.hash;
    }

    // maintain the pointer back to the parent.
    w.presenterView = window;
  }
  catch(e) {
    console.log('Slave window failed to open.');
    console.log(e);
  }
}

function zoom()
{
  if(window.innerWidth <= 480) {
    $(".zoomed").css("zoom", 0.32);
  }
  else {
    var hSlide = parseFloat($("#preso").height());
    var wSlide = parseFloat($("#preso").width());
    var hPreview = parseFloat($("#preview").height());
    var wPreview = parseFloat($("#preview").width());
    var factor = parseFloat($("#zoomer").val());

    n =  Math.min(hPreview/hSlide, wPreview/wSlide) - 0.04;

    $(".zoomed").css("zoom", n*factor);
  }
}

function presGotoSlide(slideNum)
{
    gotoSlide(slideNum)
    try { w.gotoSlide(slideNum) } catch (e) {}
    postSlide()
}

function presPrevStep()
{
    prevStep()
    try { w.prevStep() } catch (e) {}
    postSlide()
}

function presNextStep()
{
/*  // I don't know what the point of this bit was, but it's not needed.
    // read the variables set by our spawner
    incrCurr = w.incrCurr
    incrSteps = w.incrSteps
*/
	nextStep()
	try { w.nextStep() } catch (e) {}
	postSlide()
}

function postSlide()
{
	if(currentSlide) {
		try {
		  // whuuuu?
		  var notes = w.getCurrentNotes()
		}
		catch(e) {
		  var notes = getCurrentNotes()
		}
		var fileName = currentSlide.children().first().attr('ref')
		$('#notes').html(notes.html())
		$('#slideFile').text(fileName)
	}
}

//  See e.g. http://www.quirksmode.org/js/keys.html for keycodes
function keyDown(event)
{
	var key = event.keyCode;

	// pause follow mode for 30 seconds
	resetTimer();

	if (event.ctrlKey || event.altKey || event.metaKey)
		return true;

	debug('keyDown: ' + key)

	if (key >= 48 && key <= 57) // 0 - 9
	{
		gotoSlidenum = gotoSlidenum * 10 + (key - 48);
		return true;
	}

	if (key == 13) {
    if (gotoSlidenum > 0) {
      debug('go to ' + gotoSlidenum);
      slidenum = gotoSlidenum - 1;
      showSlide(true);
      try {
        w.slidenum = gotoSlidenum - 1;
        w.showSlide(true);
      } catch (e) {}
        gotoSlidenum = 0;
    } else {
      debug('executeCode');
      executeAnyCode();
      try { w.executeAnyCode(); } catch (e) {}
    }
	}

	if (key == 16) // shift key
	{
		shiftKeyActive = true;
	}

	if (key == 32) // space bar
	{
		if (shiftKeyActive) {
			presPrevStep()
		} else {
			presNextStep()
		}
	}
	else if (key == 68) // 'd' for debug
	{
		debugMode = !debugMode
		doDebugStuff()
	}
	else if (key == 37 || key == 33 || key == 38) // Left arrow, page up, or up arrow
	{
		presPrevStep();
	}
	else if (key == 39 || key == 34 || key == 40) // Right arrow, page down, or down arrow
	{
		presNextStep();
	}
	else if (key == 84 || key == 67)  // T or C for table of contents
	{
		$('#navmenu').toggle().trigger('click')
	}
	else if (key == 83)  // 's' for style
	{
		$('#stylemenu').toggle().trigger('click')
	}
	else if (key == 90 || key == 191) // z or ? for help
	{
		$('#help').toggle()
	}
	else if (key == 66 || key == 70) // f for footer (also "b" which is what kensington remote "stop" button sends
	{
		toggleFooter()
	}
	else if (key == 78) // 'n' for notes
	{
		toggleNotes()
	}
	else if (key == 27) // esc
	{
		removeResults();
		try { w.removeResults(); } catch (e) {}
	}
	else if (key == 80) // 'p' for preshow
	{
		try { w.togglePreShow(); } catch (e) {}
	}
	return true
}

//* TIMER *//

var timerSetUp = false;
var timerRunning = false;
var intervalRunning = false;
var seconds = 0;
var totalMinutes = 35;

function toggleTimer()
{
  if (!timerRunning) {
    timerRunning = true
    totalMinutes = parseInt($("#timerMinutes").attr('value'))
    $("#minStart").hide()
    $("#minStop").show()
    $("#timerInfo").text(timerStatus(0));
    seconds = 0
    if (!intervalRunning) {
      intervalRunning = true
      setInterval(function() {
        if (!timerRunning) { return; }
        seconds++;
        $("#timerInfo").text(timerStatus(seconds));
      }, 1000);  // fire every minute
    }
  } else {
    seconds = 0
    timerRunning = false
    totalMinutes = 0
    $("#timerInfo").text('')
    $("#minStart").show()
    $("#minStop").hide()
  }
}

function timerStatus(seconds) {
  var minutes = Math.round(seconds / 60);
  var left = (totalMinutes - minutes);
  var percent = Math.round((minutes / totalMinutes) * 100);
  var progress = getSlidePercent() - percent;
  setProgressColor(progress);
  return minutes + '/' + left + ' - ' + percent + '%';
}

function setProgressColor(progress) {
  ts = $('#timerSection')
  ts.removeClass('tBlue')
  ts.removeClass('tGreen')
  ts.removeClass('tYellow')
  ts.removeClass('tRed')
  if(progress > 10) {
    ts.addClass('tBlue')
  } else if (progress > 0) {
    ts.addClass('tGreen')
  } else if (progress > -10) {
    ts.addClass('tYellow')
  } else {
    ts.addClass('tRed')
  }
}

var presSetCurrentStyle = setCurrentStyle;
var setCurrentStyle = function(style, prop) {
  presSetCurrentStyle(style, false);
  try { w.setCurrentStyle(style, false); } catch (e) {}
}

/********************
 Follower Code
 ********************/
function startFollower()
{
  // Don't run on phones
  if(window.innerWidth > 480) {
    // This runs in presenter mode and will follow slide changes by other presenters.
    var ping = function() {
      // only follow if enable remote is on
      if($("#remoteToggle").attr("checked")) {
        console.log("ping");
        $.get("/getpage", function(data) {
          presGotoSlide(data);
        });
      }
      countTimer = setTimeout(ping, 1000);
    }
    countTimer = setTimeout(ping, 1000);
	}
}

// if no action for 30 seconds, then start following
function resetTimer() {
  try { clearTimeout(countTimer); } catch(e) {}
  countTimer = setTimeout(startFollower, 30000);
}
