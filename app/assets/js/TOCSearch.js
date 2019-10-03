// Module
/**
 * Simple, lightweight, usable local autocomplete library for modern browsers
 * Because there weren’t enough autocomplete scripts in the world? Because I’m completely insane and have NIH syndrome? Probably both. :P
 * @author Lea Verou https://leaverou.github.io/awesomplete
 * MIT license
 */
(function() {
'use strict';

var _ = function (input, o) {
	var me = this;

	// Setup

	this.input = $(input);
	this.input.setAttribute("autocomplete", "off");
	this.input.setAttribute("aria-autocomplete", "list");

	o = o || {};

	configure.call(this, {
		minChars: 2,
		maxItems: 10,
		autoFirst: false,
    containerClass: "awesomplete-wrapper",
    inputClass: "awesomplete",
    ulClass: null,
    statusClass: "visually-hidden",
		filter: _.FILTER_CONTAINS,
		sort: _.SORT_BYLENGTH,
    initialStatus: function(matchesCount) {
      return null; //matchesCount + ' matches were found.\n' + 'Use the Up and Down arrow keys to navigate them.';
    },
		item: function (text, input) {
			var html = input === '' ? text : text.replace(RegExp($.regExpEscape(input.trim()), "gi"), "<mark>$&</mark>");
			return $.create("li", {
				innerHTML: html,
				"aria-selected": "false"
			});
		},
		replace: function (text) {
			this.input.value = text;
		},
    onSelect: false
	}, o);

	this.index = -1;

	// Create necessary elements
	this.container = $(this.containerClass, this.parentNode) ||
                   $.create("div", {
                     className: this.containerClass,
                     around: input
                   });

	this.ul = $.create("ul", {
    className: this.ulClass || "",
		hidden: "",
		inside: this.container
	});

	this.status = $.create("span", {
		className: this.statusClass,
		role: "status",
		"aria-live": "assertive",
		"aria-relevant": "additions",
		inside: this.container
	});

	// Bind events

	$.bind(this.input, {
		"input": this.evaluate.bind(this),
		//"blur": this.close.bind(this),
    //"keydown": function(evt) {
      //var c = evt.keyCode;

      //// If the dropdown `ul` is in view, then act on keydown for the following keys:
      //// Enter / Esc / Up / Down
      //if(me.opened) {
        //if (c === 13 && me.selected) { // Enter
          //var li = me.ul.children[me.index];
          //evt.preventDefault();
          //evt.originalTarget = li;
          //me.select(li, evt);
        //}
        //else if (c === 27) { // Esc
          //me.close();
        //}
        //else if (c === 38 || c === 40) { // Down/Up arrow
          //evt.preventDefault();
          //me[c === 38? "previous" : "next"]();
        //}
      //}
    //}
	});

	//$.bind(this.input.form, {"submit": this.close.bind(this)});

	//$.bind(this.ul, {"mousedown": function(evt) {
		//var li = evt.target;

		//if (li !== this) {

			//while (li && !/li/i.test(li.nodeName)) {
				//li = li.parentNode;
			//}

			//if (li && evt.button === 0) {    // Only select on left click
        //evt.originalTarget = evt.target
        //me.select(li, evt);
			//}
		//}
	//}});

	if (this.input.hasAttribute("list")) {
		this.list = "#" + input.getAttribute("list");
		input.removeAttribute("list");
	}
	else {
		this.list = this.input.getAttribute("data-list") || o.list || [];
	}

	_.all.push(this);
};

_.prototype = {
	set list(list) {
    // if (typeof list === 'object' && !(list instanceof RegExp)) { // An array or object, not RegExp
		if (Array.isArray(list)) {
			this._list = list;
		}
		else if (typeof list === "string" && list.indexOf(",") > -1) {
				this._list = list.split(/\s*,\s*/);
		}
		else { // Element or CSS selector
			list = $(list);

			if (list && list.children) {
				this._list = slice.apply(list.children).map(function (el) {
					return el.textContent.trim();
				});
			}
		}

		if (document.activeElement === this.input) {
			this.evaluate();
		}
	},

	get selected() {
		return this.index > -1;
	},

	get opened() {
		return this.ul && this.ul.getAttribute("hidden") == null;
	},

	close: function () {
		this.ul.setAttribute("hidden", "");
		this.index = -1;
    this.status.textContent = '';


		$.fire(this.input, "awesomplete-close");
	},

	open: function () {
		this.ul.removeAttribute("hidden");

		if (this.autoFirst && this.index === -1) {
			this.goto(0);
		}

		$.fire(this.input, "awesomplete-open");
	},

	next: function () {
		var count = this.ul.children.length;

		this.goto(this.index < count - 1? this.index + 1 : -1);
	},

	previous: function () {
		var count = this.ul.children.length;

		this.goto(this.selected? this.index - 1 : count - 1);
	},

	// Should not be used, highlights specific item without any checks!
	goto: function (i) {
		var lis = this.ul.children;

		if (this.selected) {
			lis[this.index].setAttribute("aria-selected", "false");
		}

		this.index = i;

		if (i > -1 && lis.length > 0) {
			lis[i].setAttribute("aria-selected", "true");
			this.status.textContent = lis[i].textContent;
		}

		$.fire(this.input, "awesomplete-highlight");
	},

	select: function (selected, originalEvent) {
		selected = selected || this.ul.children[this.index];

		if (selected) {
			var prevented;

			$.fire(this.input, "awesomplete-select", {
        dataset: selected.dataset,
				text: selected.textContent,
        originalTarget: originalEvent.originalTarget,
				preventDefault: function () {
					prevented = true;
				}
			});

			if (!prevented) {
				this.replace(selected.textContent);
				this.close();
				$.fire(this.input, "awesomplete-selectcomplete", {
          originalTarget: originalEvent.originalTarget
        });
			}
		}
	},

	evaluate: function() {
		var me = this;
		var value = this.input.value;

		if (value.length >= this.minChars && this._list.length > 0) {
			this.index = -1;
			// Populate list with options that match
			this.ul.innerHTML = "";

			this._list
				.filter(function(item) {
					return me.filter(item, value);
				})
				.sort(this.sort)
				.every(function(text, i) {
					me.ul.appendChild(me.item(text, value));

					return i < me.maxItems - 1;
				});

      var ulLength = this.ul.children.length;
			if ( ulLength === 0) {
				this.close();
			} else {
				this.open();
        if (!this.autoFirst) {
          this.status.textContent = this.initialStatus(ulLength);
        }
			}
		}
		else {
			this.close();
		}
	}
};

// Static methods/properties

_.all = [];

_.FILTER_CONTAINS = function (text, input) {
	return RegExp($.regExpEscape(input.trim()), "i").test(text);
};

_.FILTER_STARTSWITH = function (text, input) {
	return RegExp("^" + $.regExpEscape(input.trim()), "i").test(text);
};

_.SORT_BYLENGTH = function (a, b) {
	if (a.length !== b.length) {
		return a.length - b.length;
	}

	return a < b? -1 : 1;
};

// Private functions

function configure(properties, o) {
	for (var i in properties) {
		var initial = properties[i],
		    attrValue = this.input.getAttribute("data-" + i.toLowerCase());

		if (typeof initial === "number") {
			this[i] = parseInt(attrValue);
		}
		else if (initial === false) { // Boolean options must be false by default anyway
			this[i] = attrValue !== null;
		}
		else if (initial instanceof Function) {
			this[i] = null;
		}
		else {
			this[i] = attrValue;
		}

		if (!this[i] && this[i] !== 0) {
			this[i] = (i in o)? o[i] : initial;
		}
	}
}

// Helpers

var slice = Array.prototype.slice;

function $(expr, con) {
	return typeof expr === "string"? (con || document).querySelector(expr) : expr || null;
}

function $$(expr, con) {
	return slice.call((con || document).querySelectorAll(expr));
}

$.create = function(tag, o) {
	var element = document.createElement(tag);

	for (var i in o) {
		var val = o[i];

		if (i === "inside") {
			$(val).appendChild(element);
		}
		else if (i === "around") {
			var ref = $(val);
			ref.parentNode.insertBefore(element, ref);
			element.appendChild(ref);
		}
		else if (i in element) {
			element[i] = val;
		}
		else {
			element.setAttribute(i, val);
		}
	}

	return element;
};

$.bind = function(element, o) {
	if (element) {
		for (var event in o) {
			var callback = o[event];

			event.split(/\s+/).forEach(function (event) {
				element.addEventListener(event, callback);
			});
		}
	}
};

$.fire = function(target, type, properties) {
	var evt = document.createEvent("HTMLEvents");

	evt.initEvent(type, true, true );

	for (var j in properties) {
		evt[j] = properties[j];
	}

	target.dispatchEvent(evt);
};

$.regExpEscape = function (s) {
	return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
}

// Initialization

function init() {
	$$("input.awesomplete").forEach(function (input) {
		new _(input);
	});
}

// Are we in a browser? Check for Document constructor
if (typeof Document !== "undefined") {
	// DOM already loaded?
	if (document.readyState !== "loading") {
		init();
	}
	else {
		// Wait for it
		document.addEventListener("DOMContentLoaded", init);
	}
}

_.$ = $;
_.$$ = $$;

// Make sure to export Awesomplete on self when in a browser
if (typeof self !== "undefined") {
	self.Awesomplete = _;
}

// Expose Awesomplete as a CJS module
if (typeof exports === "object") {
	module.exports = _;
}

return _;

}());

/*
 * Init using ajax
(function(){
  var tocSearchInput = document.getElementById('toc-search'),
      ajax = new XMLHttpRequest();
  ajax.open("GET", "/st/inter/tests/toc_json.txt", true);
  ajax.onload = function() {
    var list = JSON.parse(ajax.responseText);         
    new Awesomplete(tocSearchInput, {
      maxItems: 30,
      statusClass: 'h-visually-hidden',
      list: tocList,
      onSelect: function(selected){
        Awesomplete.$('a').click();
      },
      filter: function(text, input) {
        return Awesomplete.FILTER_CONTAINS(text.name, input)
      },
      sort: function (a, b) {
        return a.name < b.name? -1 : 1;
      },
      item: function(text, input) {
        var html = input === '' ? text :
                   '<a class="t-milli" href="' +
                   text.url + '">' +
                   text.name.replace(RegExp(Awesomplete.$.regExpEscape(input.trim()), "gi"), "<mark>$&</mark>") +
                   '</a>';

        return Awesomplete.$.create("li", {
          innerHTML: html,
          "data-url": text.url,
          "aria-selected": "false"
        })
      }
    });
	}
		ajax.send();
}());

End ajax init */


// static list for local search
var tocList =
 [{'name': 'Guidebook 1.6.1',
  'url': './app/Guidebook.1.6.1.search.html#guidebook-1.6.1'},
 {'name': 'Dedicated to: Motsumi, Siamela, James, & Eva.',
  'url': './app/Guidebook.1.6.1.search.html#dedicated-to:-motsumi,-siamela,-james,-&-eva.'},
 {'name': '1. Introduction',
  'url': './app/Guidebook.1.6.1.search.html#1.-introduction'},
 {'name': 'Examples of what you can build and do',
  'url': './app/Guidebook.1.6.1.search.html#examples-of-what-you-can-build-and-do'},
 {'name': 'Get familiar with what, and how people are making!',
  'url': './app/Guidebook.1.6.1.search.html#get-familiar-with-what,-and-how-people-are-making!'},
 {'name': 'Website Resources:',
  'url': './app/Guidebook.1.6.1.search.html#website-resources:'},
 {'name': 'Concept Videos',
  'url': './app/Guidebook.1.6.1.search.html#concept-videos'},
 {'name': 'Making Things With Microcomputers',
  'url': './app/Guidebook.1.6.1.search.html#making-things-with-microcomputers'},
 {'name': "What's In The Can? NEEDS new image",
  'url': './app/Guidebook.1.6.1.search.html#what%27s-in-the-can?-needs-new-image'},
 {'name': 'The 1.6v Robot in a Can eBrain',
  'url': './app/Guidebook.1.6.1.search.html#the-1.6v-robot-in-a-can-ebrain'},
 {'name': 'Two Stepper Motors. ',
  'url': './app/Guidebook.1.6.1.search.html#two-stepper-motors.'},
 {'name': 'Cardboard robot designs.',
  'url': './app/Guidebook.1.6.1.search.html#cardboard-robot-designs.'},
 {'name': 'LEDs', 'url': './app/Guidebook.1.6.1.search.html#leds'},
 {'name': 'Resistors', 'url': './app/Guidebook.1.6.1.search.html#resistors'},
 {'name': 'Potentiometer',
  'url': './app/Guidebook.1.6.1.search.html#potentiometer'},
 {'name': 'Ultrasonic Distance Sensor',
  'url': './app/Guidebook.1.6.1.search.html#ultrasonic-distance-sensor'},
 {'name': 'Patch Cables', 'url': './app/Guidebook.1.6.1.search.html#patch-cables'},
 {'name': 'Battery Pack', 'url': './app/Guidebook.1.6.1.search.html#battery-pack'},
 {'name': "What's On The Board",
  'url': './app/Guidebook.1.6.1.search.html#what%27s-on-the-board'},
 {'name': 'On the front:',
  'url': './app/Guidebook.1.6.1.search.html#on-the-front:'},
 {'name': 'On/Off Switch:',
  'url': './app/Guidebook.1.6.1.search.html#on/off-switch:'},
 {'name': 'GPIO Pins:', 'url': './app/Guidebook.1.6.1.search.html#gpio-pins:'},
 {'name': 'Power Port:', 'url': './app/Guidebook.1.6.1.search.html#power-port:'},
 {'name': 'USB Port:', 'url': './app/Guidebook.1.6.1.search.html#usb-port:'},
 {'name': 'SPI Port:', 'url': './app/Guidebook.1.6.1.search.html#spi-port:'},
 {'name': 'Connection Bay Pins:',
  'url': './app/Guidebook.1.6.1.search.html#connection-bay-pins:'},
 {'name': 'Breadboard:', 'url': './app/Guidebook.1.6.1.search.html#breadboard:'},
 {'name': 'Motor Driver:',
  'url': './app/Guidebook.1.6.1.search.html#motor-driver:'},
 {'name': 'Servo Motor:', 'url': './app/Guidebook.1.6.1.search.html#servo-motor:'},
 {'name': 'RGB LED:', 'url': './app/Guidebook.1.6.1.search.html#rgb-led:'},
 {'name': 'Light Sensor:',
  'url': './app/Guidebook.1.6.1.search.html#light-sensor:'},
 {'name': 'D-Pad:', 'url': './app/Guidebook.1.6.1.search.html#d-pad:'},
 {'name': 'On the back:', 'url': './app/Guidebook.1.6.1.search.html#on-the-back:'},
 {'name': 'ESP8266: ', 'url': './app/Guidebook.1.6.1.search.html#esp8266:'},
 {'name': 'Getting started ',
  'url': './app/Guidebook.1.6.1.search.html#getting-started'},
 {'name': 'How to Connect',
  'url': './app/Guidebook.1.6.1.search.html#how-to-connect'},
 {'name': 'Quick start!', 'url': './app/Guidebook.1.6.1.search.html#quick-start!'},
 {'name': 'Snap! For Real Power! ',
  'url': './app/Guidebook.1.6.1.search.html#snap!-for-real-power!'},
 {'name': 'Step 0: Download Snap!',
  'url': './app/Guidebook.1.6.1.search.html#step-0:-%5Bdownload-snap!%5D(https://github.com/robot-in-a-can/evebrain-snap-webapp/archive/master.zip)'},
 {'name': 'Step 1: Unzip and Open Snap.html',
  'url': './app/Guidebook.1.6.1.search.html#step-1:-unzip-and-open-snap.html'},
 {'name': 'Step 2 - Turn the eBrain On',
  'url': './app/Guidebook.1.6.1.search.html#step-2---turn-the-ebrain-on'},
 {'name': 'Step 3 - Connect the eBrain to Snap!',
  'url': './app/Guidebook.1.6.1.search.html#step-3---connect-the-ebrain-to-snap!'},
 {'name': '192.168.4.1, What is that about?',
  'url': './app/Guidebook.1.6.1.search.html#192.168.4.1,-what-is-that-about?'},
 {'name': 'Building The Robot',
  'url': './app/Guidebook.1.6.1.search.html#building-the-robot'},
 {'name': 'The Cube Robot',
  'url': './app/Guidebook.1.6.1.search.html#the-cube-robot'},
 {'name': 'Programming The Robot',
  'url': './app/Guidebook.1.6.1.search.html#programming-the-robot'},
 {'name': 'Drawing With The Robot',
  'url': './app/Guidebook.1.6.1.search.html#drawing-with-the-robot'},
 {'name': 'Programming With Snap!',
  'url': './app/Guidebook.1.6.1.search.html#programming-with-snap!'},
 {'name': 'Circuits and Electricity',
  'url': './app/Guidebook.1.6.1.search.html#circuits-and-electricity'},
 {'name': 'The History of Electricity & Magnetism',
  'url': './app/Guidebook.1.6.1.search.html#the-history-of-electricity-&-magnetism'},
 {'name': 'What is Electric Flow?',
  'url': './app/Guidebook.1.6.1.search.html#what-is-electric-flow?'},
 {'name': 'Batteries', 'url': './app/Guidebook.1.6.1.search.html#batteries'},
 {'name': 'Making Circuits',
  'url': './app/Guidebook.1.6.1.search.html#making-circuits'},
 {'name': 'Using The Breadboard',
  'url': './app/Guidebook.1.6.1.search.html#using-the-breadboard'},
 {'name': 'Blinking the LED',
  'url': './app/Guidebook.1.6.1.search.html#blinking-the-led'},
 {'name': 'General Purpose Input Output',
  'url': './app/Guidebook.1.6.1.search.html#general-purpose-input-output'},
 {'name': 'What is a Computer?',
  'url': './app/Guidebook.1.6.1.search.html#what-is-a-computer?'},
 {'name': 'Input and Output',
  'url': './app/Guidebook.1.6.1.search.html#input-and-output'},
 {'name': 'LED Output', 'url': './app/Guidebook.1.6.1.search.html#led-output'},
 {'name': 'Button Input', 'url': './app/Guidebook.1.6.1.search.html#button-input'},
 {'name': 'Binary', 'url': './app/Guidebook.1.6.1.search.html#binary'},
 {'name': 'Analog Input', 'url': './app/Guidebook.1.6.1.search.html#analog-input'},
 {'name': 'Pulse Width Modulation',
  'url': './app/Guidebook.1.6.1.search.html#pulse-width-modulation'},
 {'name': 'Robot in a Can Projects',
  'url': './app/Guidebook.1.6.1.search.html#robot-in-a-can-projects'},
 {'name': 'Brick Breaker Game',
  'url': './app/Guidebook.1.6.1.search.html#brick-breaker-game'},
 {'name': 'Pong Game', 'url': './app/Guidebook.1.6.1.search.html#pong-game'},
 {'name': 'Asteroids Game',
  'url': './app/Guidebook.1.6.1.search.html#asteroids-game'},
 {'name': 'Photovore Robot',
  'url': './app/Guidebook.1.6.1.search.html#photovore-robot'},
 {'name': 'Ultrasonic Sensing Robot',
  'url': './app/Guidebook.1.6.1.search.html#ultrasonic-sensing-robot'},
 {'name': 'Component Dictionary of Sensors and Extras',
  'url': './app/Guidebook.1.6.1.search.html#component-dictionary-of-sensors-and-extras'},
 {'name': 'Light Sensor', 'url': './app/Guidebook.1.6.1.search.html#light-sensor'},
 {'name': 'RGB LED', 'url': './app/Guidebook.1.6.1.search.html#rgb-led'},
 {'name': 'Ultrasonic Distance Sensor',
  'url': './app/Guidebook.1.6.1.search.html#ultrasonic-distance-sensor'},
 {'name': 'Relay', 'url': './app/Guidebook.1.6.1.search.html#relay'},
 {'name': 'Temperature sensors',
  'url': './app/Guidebook.1.6.1.search.html#temperature-sensors'},
 {'name': 'Extra Resources',
  'url': './app/Guidebook.1.6.1.search.html#extra-resources'},
 {'name': 'Troubleshooting Guide',
  'url': './app/Guidebook.1.6.1.search.html#troubleshooting-guide'},
 {'name': 'Changing Language Settings',
  'url': './app/Guidebook.1.6.1.search.html#changing-language-settings'},
 {'name': 'Using the eBrain with Arduino',
  'url': './app/Guidebook.1.6.1.search.html#using-the-ebrain-with-arduino'},
 {'name': '<!--Downloads and Open Source Materials-->',
  'url': './app/Guidebook.1.6.1.search.html#%3C!--downloads-and-open-source-materials--%3E'}]
;

var tocSearchInput = document.getElementById('toc-search');
new Awesomplete(tocSearchInput, {
  maxItems: 30,
  statusClass: 'h-visually-hidden',
  list: tocList,
  onSelect: function(selected){
    Awesomplete.$('a').click();
  },
  filter: function(text, input) {
    return Awesomplete.FILTER_CONTAINS(text.name, input)
  },
  sort: function (a, b) {

    return a.name < b.name? -1 : 1;
  },
  item: function(text, input) {
    var html =
               '<a class="t-milli" target="_blank" href="' +
               text.url + '">' +
               text.name.replace(RegExp(Awesomplete.$.regExpEscape(input.trim()), "gi"), "<mark>$&</mark>") +
               '</a>';

    return Awesomplete.$.create("li", {
      innerHTML: html,
      "data-url": text.url,
      "aria-selected": "false"
    })
  }
});


tocSearchInput.addEventListener('awesomplete-selectcomplete', function(e){
  console.log(e.originalTarget.getAttribute('data-url'));
  // window.location.href = e.dataset.url;
});
