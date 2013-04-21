// Pages API Script 1.0

var ContentCache = (function () {

	var obj_type = typeof({});



	var c = function (settings) {

		this.settings = {
			double_detection: false,
			double_detection_ratio: 1.1
		};
		this_private.settings_load.call(this, this.settings, (settings == null || typeof(settings) != obj_type) ? {} : settings);

		this.events = {
			"add": [],
			"remove": [],
			"load": [],
			"error": [],
			"change": []
		};

		this.length = 0;
		this.contents = [];

	};

	var this_private = {

		trigger: function (event_name, data, reversed) {
			var e = this.events[event_name];
			if (reversed) {
				for (var i = e.length - 1; i >= 0; --i) {
					e[i].call(this, data);
				}
			}
			else {
				for (var i = 0; i < e.length; ++i) {
					e[i].call(this, data);
				}
			}
		},

		on_image_load: function (obj, event, content) {
			content.ready = true;

			content.size.width = obj.width;
			content.size.height = obj.height;

			// Two pages?
			if (this.settings.double_detection && !content.two) {
				if (content.size.width / content.size.height >= this.settings.double_detection_ratio) {
					content.two = true;

					// Change
					this_private.trigger.call(this, "change", {
						content: content,
						context: null,
						change: "two"
					});
				}
			}

			// Event
			this_private.trigger.call(this, "load", {
				content: content,
				context: null
			});
		},
		on_image_error: function (obj, event, content) {
			content.error = true;

			// Event
			this_private.trigger.call(this, "error", {
				content: content,
				context: null
			});
		},

		add_event_listener: function (event_list, object, event_name, callback) {
			event_list.push([ object , event_name , callback ]);
			object.addEventListener(event_name, callback, false);
		},
		remove_event_listeners: function (event_list) {
			for (var i = 0; i < event_list.length; ++i) {
				event_list[i][0].removeEventListener(event_list[i][1], event_list[i][2], false);
			}
		},

		settings_load: function (settings, s) {
			for (var key in settings) {
				if (key in s) {
					if (typeof(settings[key]) == obj_type && settings[key] != null) {
						if (typeof(s[key]) == obj_type && s[key] != null) {
							this_private.settings_load.call(this, settings[key], s[key]);
						}
					}
					else {
						if (typeof(s[key]) != obj_type || s[key] == null) {
							settings[key] = s[key];
						}
					}
				}
			}
		}

	};

	c.prototype = {
		constructor: c,

		add: function (params) {
			var self = this;

			// Create new content
			var c = {
				preload_image: null,
				event_list: [],
				ready: false,
				error: false,
				url: params.url || "",
				name: "",
				two: params.two || false,
				size: { width:0 , height:0 }
			};
			this.contents.push(c);
			this.length = this.contents.length;

			// Name
			c.name = ("name" in params ? params.name : c.url.split("/").pop());

			// Preload image
			c.preload_image = new Image();
			this_private.add_event_listener.call(this, c.event_list, c.preload_image, "load", function (event) {
				return this_private.on_image_load.call(self, this, event, c);
			});
			this_private.add_event_listener.call(this, c.event_list, c.preload_image, "error", function (event) {
				return this_private.on_image_error.call(self, this, event, c);
			});
			c.preload_image.src = c.url;

			// Event
			this_private.trigger.call(this, "add", {
				content: c,
				context: null
			});

			// Done
			return c;
		},
		remove: function (content) {
			// Find index
			var i = 0;
			while (i < this.contents.length) {
				if (content == this.contents[i]) break;
				++i;
			}
			if (i >= this.contents.length) return;

			// Remove events
			this_private.remove_event_listeners.call(this, content.event_list);
			content.event_list = [];

			// Remove
			this.contents.splice(i, 1);
			this.length = this.contents.length;

			// Event
			this_private.trigger.call(this, "remove", {
				content: content,
				context: null
			}, true);
		},
		remove_all: function () {
			// Remove
			while (this.contents.length > 0) {
				this.remove(this.contents[0]);
			}
		},

		get: function (index) {
			if (index < 0) index = 0;
			else if (index >= this.contents.length) index = this.contents.length - 1;

			return this.contents[index];
		},

		on: function (event_name, callback) {
			if (event_name in this.events) {
				this.events[event_name].push(callback);
			}

			return this;
		},
		off: function (event_name, callback) {
			if (event_name in this.events) {
				var e = this.events[event_name];
				for (var i = 0; i < e.length; ++i) {
					if (e[i] == callback) {
						e.splice(i, 1);
						break;
					}
				}
			}

			return this;
		},

		attach: function (obj) {
			for (var i = 0; i < this.contents.length; ++i) {
				// Trigger events
				this_private.trigger.call(this, "add", {
					content: this.contents[i],
					context: obj
				});
				if (this.contents[i].ready) {
					this_private.trigger.call(this, "load", {
						content: this.contents[i],
						context: obj
					});
				}
				if (this.contents[i].error) {
					this_private.trigger.call(this, "error", {
						content: this.contents[i],
						context: obj
					});
				}
			}
		},
		destroy: function () {
			this.remove_all();
		}

	};

	return c;

})();

var Pages = (function () {

	var css = {
		transform: "transform",
		transformOrigin: "transformOrigin",
		transformStyle: "transformStyle",
		transition: "transition",
		perspective: "perspective",
		perspectiveOrigin: "perspectiveOrigin",
		backfaceVisibility: "backfaceVisibility"
	};
	var css2 = {};
	var events = {
		transitionend: "transitionend"
	};
	(function () {
		var e = document.createElement("div");
		var prefixes = [ "" , "webkit" , "Moz" , "O" , "ms" ];
		var prefixes2 = [ "" , "-webkit-" , "-moz-" , "-o-" , "-ms-" ];

		for (var key in css) {
			var key2 = key;
			for (var i = 0; i < prefixes.length; ++i) {
				if (typeof(e.style[prefixes[i] + key2]) == typeof("")) {
					css[key] = prefixes[i] + key2;

					css2[key] = prefixes2[i] + key.replace(/([A-Z])/g, function (a, b, c) {
						return "-" + a.toLowerCase();
					});

					break;
				}
				if (i == 0) key2 = key.substr(0, 1).toUpperCase() + key.substr(1);
			}
		}

		if (css["transition"] != "transition") events.transitionend = css["transition"] + "End";
	})();
	var get_computed_style = function (elem) {
		return window.getComputedStyle(elem, null);
	};

	var obj_type = typeof({});
	var bool_type = typeof(true);
	var number_type = typeof(1.0);
	var string_type = typeof("");

	var DISPLAY_FRONT = 0;
	var DISPLAY_BACK = 1;
	var DISPLAY_ONE = 2;
	var DISPLAY_ONLY = 3;
	var DISPLAY_TWO = 4;
	var DISPLAY_DOUBLE = 5;

	var HINGE_ALIGN_LEFT = 0;
	var HINGE_ALIGN_CENTER = 1;
	var HINGE_ALIGN_RIGHT = 2;

	var POSITION_LEFT = 0;
	var POSITION_FRONT = 90;
	var POSITION_RIGHT = 180;



	var p = function (settings) {
		var self = this;

		// Load settings
		this.settings = {
			debug: false,
			aspect_ratio: 0.7, // w / h
			aspect_ratio_page_count: 0, // 0, 1, or 2
			display_two: true,
			display_single_first: false,
			separate_double_page: false,
			left_to_right: true,
			binding_fix: true,
			page_background_color: {
				left: "#ffffff",
				right: "#ffffff"
			},
			screen_padding: {
				horizontal: 0.1,
				vertical: 0.15,
			},
			perspective_scale: 2,
			transition_timeout: 100,
			animation: {
				browser_zoom: {
					enabled: true,
					speed: 1.0,
					method: "ease-in-out"
				},
				zoom: {
					enabled: true,
					speed: 1.0,
					method: "ease-in-out"
				},
				hinge_location: {
					enabled: true,
					speed: 1.0,
					method: "ease-in-out"
				},
				page_resize: {
					enabled: true,
					speed: 1.0,
					method: "ease-in-out"
				},
				page_open: {
					enabled: true,
					speed: 1.0,
					method: "ease-out"
				},
				page_close: {
					enabled: true,
					speed: 1.0,
					method: "ease-in"
				},
				page_flip: {
					enabled: true,
					speed: 2.0,
					method: "ease-in-out"
				},
				image_fade: {
					enabled: true,
					not_on_first: true,
					speed: 0.5,
					method: "ease-in-out"
				},
				page_fade_out: {
					enabled: true,
					speed: 0.5,
					method: "linear"
				},
			}
		};
		this_private.settings_load.call(this, this.settings, (settings == null || typeof(settings) != obj_type) ? {} : settings);

		// Vars
		this.event_list = [];
		this.container_size = {
			width: 0,
			height: 0
		};
		this.opened = false;
		this.opening = false;
		this.closing = false;
		this.hinge_align = HINGE_ALIGN_CENTER;
		this.zoom_factor = 1.0;
		this.zoom_location = { x:0.5, y:0.5 };

		// Display pages
		this.display_page_size = {
			width: 0,
			height: 0
		};
		this.display_pages = []; // Ordered

		// Content pages
		this.pages = [];
		this.page_current = -1;
		this.contents = settings.contents;
		this.contents_events = {
			add: function (data) {
				return this_private.on_content_add.call(self, data);
			},
			remove: function (data) {
				return this_private.on_content_remove.call(self, data);
			},
			change: function (data) {
				return this_private.on_content_change.call(self, data);
			},
			load: function (data) {
				return this_private.on_content_load.call(self, data);
			}
		};
		for (var event in this.contents_events) {
			this.contents.on(event, this.contents_events[event]);
		}

		//{ DOM setup
			// HTML scope
			this.html_container = document.createElement("div")
			if (settings.container) settings.container.appendChild(this.html_container);
			this.html_container.style.position = "absolute";
			this.html_container.style.left = "0";
			this.html_container.style.top = "0";
			this.html_container.style.right = "0";
			this.html_container.style.bottom = "0";
			this.html_container.style.overflow = "hidden";
			if (this.settings.debug) this.html_container.style.boxShadow = "0px 0px 8px 8px rgba(255,0,0,0.5) inset";

			// HTML container center
			this.html_container.appendChild(this.html_container_center = document.createElement("div"));
			this.html_container_center.style.display = "block";
			this.html_container_center.style.position = "absolute";
			this.html_container_center.style.left = "50%";
			this.html_container_center.style.top = "50%";
			this.html_container_center.style.width = "100%";
			this.html_container_center.style.height = "100%";
			if (this.settings.debug) this.html_container_center.style.boxShadow = "0px 0px 8px 8px rgba(255,128,0,0.5) inset";

			// Zoom container
			this.html_container_center.appendChild(this.zoom_container = document.createElement("div"));
			this.zoom_container.style.display = "block";
			this.zoom_container.style.position = "absolute";
			this.zoom_container.style.left = "-50%";
			this.zoom_container.style.top = "-50%";
			this.zoom_container.style.width = "100%";
			this.zoom_container.style.height = "100%";
			if (this.settings.debug) this.zoom_container.style.boxShadow = "0px 0px 8px 8px rgba(255,255,0,0.5) inset";

			// Zoom container offset size
			this.zoom_container.appendChild(this.zoom_container_offset_size = document.createElement("div"));
			this.zoom_container_offset_size.style.display = "block";
			this.zoom_container_offset_size.style.position = "absolute";
			this.zoom_container_offset_size.style.left = "50%";
			this.zoom_container_offset_size.style.top = "50%";
			this.zoom_container_offset_size.style.width = "0%";
			this.zoom_container_offset_size.style.height = "0%";
			if (this.settings.debug) this.zoom_container_offset_size.style.boxShadow = "0px 0px 8px 8px rgba(0,255,0,0.5) inset";

			// Zoom container offset
			this.zoom_container_offset_size.appendChild(this.zoom_container_offset = document.createElement("div"));
			this.zoom_container_offset.style.display = "block";
			this.zoom_container_offset.style.position = "absolute";
			this.zoom_container_offset.style.left = "0%";
			this.zoom_container_offset.style.top = "0%";
			this.zoom_container_offset.style.width = "0px";
			this.zoom_container_offset.style.height = "0px";
			if (this.settings.debug) this.zoom_container_offset.style.boxShadow = "0px 0px 8px 8px rgba(0,255,255,0.5) inset";

			// Browser zoom
			this.zoom_container_offset.appendChild(this.browser_zoom_container = document.createElement("div"));
			this.browser_zoom_container.style.display = "block";
			this.browser_zoom_container.style.position = "absolute";
			this.browser_zoom_container.style.overflow = "hidden";
			if (this.settings.debug) this.browser_zoom_container.style.boxShadow = "0px 0px 8px 8px rgba(0,128,255,0.5) inset";

			// Hinge container
			this.browser_zoom_container.appendChild(this.hinge_container = document.createElement("div"));
			this.hinge_container.style.display = "block";
			this.hinge_container.style.position = "absolute";
			this.hinge_container.style.left = "50%";
			this.hinge_container.style.top = "0px";
			this.hinge_container.style.width = "100%";
			this.hinge_container.style.height = "100%";
			if (this.settings.debug) this.hinge_container.style.boxShadow = "0px 0px 8px 8px rgba(0,0,255,0.5) inset";

			// Hinge offset container
			this.hinge_container.appendChild(this.hinge_offset_container = document.createElement("div"));
			this.hinge_offset_container.style.display = "block";
			this.hinge_offset_container.style.position = "absolute";
			this.hinge_offset_container.style.left = "0px";
			this.hinge_offset_container.style.top = "0px";
			this.hinge_offset_container.style.width = "100%";
			this.hinge_offset_container.style.height = "100%";
			if (this.settings.debug) this.hinge_offset_container.style.boxShadow = "0px 0px 8px 8px rgba(128,0,255,0.5) inset";

			// Page size container
			this.hinge_offset_container.appendChild(this.perspective_container = document.createElement("div"));
			this.perspective_container.style.display = "block";
			this.perspective_container.style.position = "absolute";
			this.perspective_container.style.left = "0";
			this.perspective_container.style.top = "50%";
			this.perspective_container.style.width = "0px";
			this.perspective_container.style.height = "0px";
			this.perspective_container.style[css.perspective] = "1px";
			this.perspective_container.style[css.perspectiveOrigin] = "0% 0%";
			this.perspective_container.style[css.transformStyle] = "preserve-3d";
			if (this.settings.debug) this.perspective_container.style.boxShadow = "0px 0px 8px 8px rgba(255,0,255,0.5) inset";
		//}

		// Setup
		this_private.update_screen_size.call(this);
		setTimeout(function () {
			var a;
			if ((a = self.settings.animation.browser_zoom).enabled) {
				self.browser_zoom_container.style[css.transition] = "left " + a.speed + "s " + a.method + ", top " + a.speed + "s " + a.method + ", width " + a.speed + "s " + a.method + ", height " + a.speed + "s " + a.method;
			}
			if ((a = self.settings.animation.zoom).enabled) {
				self.zoom_container.style[css.transition] = "width " + a.speed + "s " + a.method + ", height " + a.speed + "s " + a.method + ", left " + a.speed + "s " + a.method + ", top " + a.speed + "s " + a.method;
				self.zoom_container_offset_size.style[css.transition] = "width " + a.speed + "s " + a.method + ", height " + a.speed + "s " + a.method;
			}
			if ((a = self.settings.animation.hinge_location).enabled) {
				self.hinge_offset_container.style[css.transition] = "left " + a.speed + "s " + a.method + ", top " + a.speed + "s " + a.method;
			}
			if ((a = self.settings.animation.page_resize).enabled) {
				self.perspective_container.style[css.transition] = "width " + a.speed + "s " + a.method + ", height " + a.speed + "s " + a.method;
			}
		}, 1);

		// Events
		this_private.add_event_listener.call(this,
			this.event_list,
			window,
			"resize",
			function (event) {
				return this_private.on_window_resize.call(self, event);
			}
		);

		// Trigger attachment
		this.contents.attach(this);

	};

	this_private = {
		on_display_page_transition_end: function (obj, event, d_page) {
			// Flipping
			if (obj == d_page.container) {
				// Completed
				d_page.animation.completed = true;
				if (d_page.animation.ready) {
					// Change z-index
					d_page.container.style.zIndex = "0";

					// Remove anything underneath
					if (d_page.animation.target.position == POSITION_LEFT) {
						// Remove before
						var i = 0;
						while (this.display_pages[i] != d_page) {
							//if (i >= this.display_pages.length) break;
							if (this.display_pages[i].animation.target.position != POSITION_LEFT || (!this.display_pages[i].animation.completed && !this.display_pages[i].animation.not_animated)) {
								// Prevents against browser timing issues
								++i;
								continue;
							}
							this_private.destroy_display_page.call(this, this.display_pages[i]);
						}
					}
					else if (d_page.animation.target.position == POSITION_RIGHT) {
						// Remove after
						var i = 1;
						while (this.display_pages[this.display_pages.length - i] != d_page) {
							//if (this.display_pages.length - i < 0) break;
							if (this.display_pages[this.display_pages.length - i].animation.target.position != POSITION_RIGHT || (!this.display_pages[this.display_pages.length - i].animation.completed && !this.display_pages[this.display_pages.length - i].animation.not_animated)) {
								// Prevents against browser timing issues
								++i;
								continue;
							}
							this_private.destroy_display_page.call(this, this.display_pages[this.display_pages.length - i]);
						}
					}

					// Callback
					if (d_page.animation.on_complete) {
						d_page.animation.on_complete.call(this, d_page);
						d_page.animation.on_complete = null;
					}
				}
			}
			else if (obj == d_page.opacity_container) {
				// Remove
				if (d_page.animation.ready || d_page.animation.not_animated) {
					if (parseFloat(d_page.opacity_container.style.opacity) == 0.0) {
						this_private.destroy_display_page.call(this, d_page);
					}
				}
			}

			event.stopPropagation();
			return true;
		},
		on_display_page_image_fade_transition_end: function (obj, event, d_page, d_page_side, image_object) {
			// Alpha
			if (parseFloat(image_object.image.style.opacity) == 0) {
				// Remove
				for (var i = 0; i < d_page_side.images.length; ++i) {
					if (d_page_side.images[i] == image_object) {
						d_page_side.images.splice(i, 1);
						break;
					}
				}
				if (image_object.image.parentNode != null) {
					image_object.image.parentNode.removeChild(image_object.image);
				}
			}

			if (event != null) event.stopPropagation();
			return true;
		},

		on_window_resize: function (event) {
			this_private.update_screen_size.call(this);
		},

		on_content_add: function (data) {
			if (data.context != null && data.context != this) return;

			var c = data.content, pg;

			// Custom
			c.custom = {
				true_pages: [],
				on_load_waiters: []
			};

			// Indexed
			if (c.two) {
				if (this.settings.display_two) {
					// Check if it needs padding
					if (this.settings.display_single_first != (this.pages.length % 2 == 1) && !this.settings.separate_double_page) {
						// Blank padding page
						pg = { content:c, blank:true, first:true, two:false };
						c.custom.true_pages.push(pg);
						this.pages.push(pg);
					}
				}
				// Takes up 2 pages
				pg = { content:c, blank:false, first:true, two:true };
				c.custom.true_pages.push(pg);
				this.pages.push(pg);
				pg = { content:c, blank:false, first:false, two:true };
				c.custom.true_pages.push(pg);
				this.pages.push(pg);
			}
			else {
				// Single page
				pg = { content:c, blank:false, first:true, two:false };
				c.custom.true_pages.push(pg);
				this.pages.push(pg);
			}

			// Set as current if none set
			if (this.page_current < 0) this.page_current = 0;
		},
		on_content_remove: function (data) {
			if (data.context != null && data.context != this) return;

			// Pre
			var disp = this_private.get_current_page_display.call(this);
			var start = -1;

			// Remove page(s)
			var pc = this.page_current;
			var shift_by = -data.content.custom.true_pages.length;
			while (data.content.custom.true_pages.length > 0) {
				var i = 0;
				while (i < this.pages.length) {
					if (this.pages[i] == data.content.custom.true_pages[0]) break;
					++i;
				}
				if (start < 0 || i < start) {
					start = i;
				}
				this_private.remove_page_from_list.call(this, data.content.custom.true_pages[0]);
			}

			// Fix end
			this_private.updage_page_list.call(this, start);
			if (this.page_current >= this.pages.length) this.page_current = this.pages.length - 1;

			// Flip
			var disp2 = this_private.get_current_page_display.call(this);
			if ((this.page_current != pc || disp2[0] != disp[0]) && this.pages.length > 0) {
				// Update page display
				this_private.update_display_pages.call(this, disp, {flip_forward:true});
			}

			// Close?
			if (this.pages.length == 0) {
				this.close({immediate:true});
			}
		},
		on_content_change: function (data) {
			if (data.context != null && data.context != this) return;

			// Image change
			if (data.change == "image") {
				// Update display pages
				for (var i = 0; i < this.display_pages.length; ++i) {
					if (this.display_pages[i].left.page.content == data.content) {
						this_private.set_display_page_content.call(this,
							this.display_pages[i],
							this.display_pages[i].left,
							this.display_pages[i].left.page,
							true,
							true
						);
					}
					if (this.display_pages[i].right.page.content == data.content) {
						this_private.set_display_page_content.call(this,
							this.display_pages[i],
							this.display_pages[i].right,
							this.display_pages[i].right.page,
							true,
							true
						);
					}
				}
			}
			if (data.change == "two") {
				// Add/remove extra pages
				if (data.content.two) {
					// Add
					for (var i = 0; i < this.pages.length; ++i) {
						if (this.pages[i] == data.content.custom.true_pages[0]) {
							// Add
							this.pages[i].two = true;
							this.pages[i].first = true;
							this.pages[i].blank = false;
							this_private.insert_page_into_list.call(this, i + 1, {
								content: this.pages[i].content,
								first: false,
								two: true,
								blank: false
							});
							// Fix
							this_private.updage_page_list.call(this, i);
							break;
						}
					}
				}
				else {
					// Remove
					for (var i = 0; i < data.content.custom.true_pages.length; ++i) {
						if (!data.content.custom.true_pages[i].two || !data.content.custom.true_pages[i].first) {
							// Remove
							this_private.remove_page_from_list.call(this, data.content.custom.true_pages[i]);
							--i;
						}
						else {
							data.content.custom.true_pages[i].first = true;
							data.content.custom.true_pages[i].two = false;
							data.content.custom.true_pages[i].blank = false;
						}
					}
					// Fix
					this_private.updage_page_list.call(this, 0);
				}
			}
		},
		on_content_load: function (data) {
			if (data.context != null && data.context != this) return;

			var c = data.content;

			// Waiting
			for (var i = 0; i < c.custom.on_load_waiters.length; ++i) {
				this_private.set_display_page_image.call(this,
					c.custom.on_load_waiters[i][0],
					c.custom.on_load_waiters[i][1],
					true
				);
				this_private.set_display_page_size.call(this,
					c.custom.on_load_waiters[i][0]
				);
			}
			c.custom.on_load_waiters = [];
		},

		settings_load: function (settings, s) {
			for (var key in settings) {
				if (key in s) {
					if (typeof(settings[key]) == obj_type && settings[key] != null) {
						if (typeof(s[key]) == obj_type && s[key] != null) {
							this_private.settings_load.call(this, settings[key], s[key]);
						}
					}
					else {
						if (typeof(s[key]) != obj_type || s[key] == null) {
							settings[key] = s[key];
						}
					}
				}
			}
		},

		add_event_listener: function (event_list, object, event_name, callback) {
			event_list.push([ object , event_name , callback ]);
			object.addEventListener(event_name, callback, false);
		},
		remove_event_listeners: function (event_list) {
			for (var i = 0; i < event_list.length; ++i) {
				event_list[i][0].removeEventListener(event_list[i][1], event_list[i][2], false);
			}
		},

		create_display_page: function (params) {
			var self = this;

			// Vars
			var d_page = {
				removed: false,

				position: params.position,

				container: null,
				opacity_container: null,

				left: {
					side: "left",
					page: params.page.left,
					images: [],
					container: null,
					image_container: null
				},
				right: {
					side: "right",
					page: params.page.right,
					images: [],
					container: null,
					image_container: null
				},

				event_list: [],

				animation: {
					on_start: null,
					on_complete: null,

					completed: true,
					setup_timer: null,
					ready: false,
					not_animated: true,

					on_start_timers: [],

					target: {
						position: params.position,
						animation: {
							speed: 0,
							method: ""
						},
						on_start: null,
						on_complete: null
					}
				}
			};

			// Main container
			d_page.container = document.createElement("div");
			d_page.container.style.display = "block";
			d_page.container.style.position = "absolute";
			d_page.container.style.top = "-50%";
			d_page.container.style.left = "-100%";
			d_page.container.style.width = "100%";
			d_page.container.style.height = "100%";
			d_page.container.style[css.transformOrigin] = "100% 0%";
			d_page.container.style[css.transformStyle] = "preserve-3d";
			d_page.container.style[css.transform] = "rotateY(" + d_page.position + "deg)";
			d_page.container.style.zIndex = "0";

			// Opacity
			d_page.container.appendChild(d_page.opacity_container = document.createElement("div"));
			d_page.opacity_container.style.display = "block";
			d_page.opacity_container.style.position = "absolute";
			d_page.opacity_container.style.left = "0";
			d_page.opacity_container.style.top = "0";
			d_page.opacity_container.style.right = "0";
			d_page.opacity_container.style.bottom = "0";
			d_page.opacity_container.style.opacity = ("opacity" in params ? params.opacity : 1.0);
			d_page.opacity_container.style[css.transformStyle] = "preserve-3d";

			// Image content
			var sides = [ "left" , "right" ];
			for (var i = 0; i < sides.length; ++i) {
				var s = d_page[sides[i]];

				// Container
				d_page.opacity_container.appendChild(s.container = document.createElement("div"));
				s.container.style.display = "block";
				s.container.style.position = "absolute";
				s.container.style.left = "0"
				s.container.style.right = "0";
				s.container.style.top = "0";
				s.container.style.bottom = "0";
				s.container.style.background = this.settings.page_background_color[sides[i]];
				if (i == 1) {
					s.container.style[css.transform] = "rotateY(180deg)";
					s.container.style[css.transformOrigin] = "50% 50%";
				}
				s.container.style[css.transformStyle] = "preserve-3d";
				s.container.style[css.backfaceVisibility] = "hidden";

				// Image
				s.container.appendChild(s.image_container = document.createElement("div"));
				s.image_container.style.display = "block";
				s.image_container.style.position = "absolute";
				if (this.settings.binding_fix) {
					s.image_container.style.left = (i == 1 ? "0.375px" : "-0.375px"); // to prevent a 1px offset in firefox
					s.image_container.style.right = (i == 0 ? "-0.375px" : "0.375px");
				}
				else {
					s.image_container.style.left = "0";
					s.image_container.style.right = "0";
				}
				s.image_container.style.top = "0";
				s.image_container.style.bottom = "0";
				s.container.style[css.transformStyle] = "preserve-3d";
				s.container.style[css.backfaceVisibility] = "hidden";
			}

			// Base settings
			this_private.set_display_page_content.call(this, d_page, d_page.left, d_page.left.page, false, false);
			this_private.set_display_page_content.call(this, d_page, d_page.right, d_page.right.page, false, false);
			this_private.set_display_page_size.call(this, d_page);

			// Add
			if (params.order == "right") {
				this.display_pages.push(d_page);
			}
			else {
				this.display_pages.splice(0, 0, d_page);
			}
			// Add DOM to lowest
			var c = this.perspective_container.firstChild;
			if (c == null) {
				this.perspective_container.appendChild(d_page.container);
			}
			else {
				this.perspective_container.insertBefore(d_page.container, c);
			}

			// Event listeners
			this_private.add_event_listener.call(this, d_page.event_list, d_page.container, events.transitionend, function (event) {
				return this_private.on_display_page_transition_end.call(self, this, event, d_page);
			});
			this_private.add_event_listener.call(this, d_page.event_list, d_page.opacity_container, events.transitionend, function (event) {
				return this_private.on_display_page_transition_end.call(self, this, event, d_page);
			});

			// Animation settings
			setTimeout(function () {
				var a, s;
				if ((a = self.settings.animation.page_fade_out).enabled) {
					s = "opacity " + a.speed + "s " + a.method;
					d_page.opacity_container.style[css.transition] = s;
				}
			}, 1);

			// Animation
			if (params.animation) {
				this_private.animate_display_page.call(this, d_page, params.animation);
			}

			// Return
			return d_page;
		},
		destroy_display_page: function (d_page) {
			if (d_page.removed) return;
			d_page.removed = true;

			// Remove, update indices
			for (var i = 0; i < this.display_pages.length; ++i) {
				if (d_page == this.display_pages[i]) {
					this.display_pages.splice(i, 1);
					break;
				}
			}

			// Remove HTML
			d_page.container.parentNode.removeChild(d_page.container);
		},

		animate_display_page: function (d_page, params) {
			// Check if needed
			if (d_page.animation.target.position != params.position) {
				if (
					d_page.animation.target.animation.speed != params.animation.speed ||
					d_page.animation.target.animation.method != params.animation.method ||
					d_page.animation.ready
				) {
					// Needed
					this_private.animate_display_page_transition_setup_delay.call(this,
						d_page,
						params.position,
						params.animation.speed,
						params.animation.method,
						params.on_start || null,
						params.on_complete || null
					);
				}
				else {
					// Change
					d_page.animation.target.on_start = params.on_start || null;
					d_page.animation.target.on_complete = params.on_complete || null;
				}
				// Animating
				d_page.container.style.zIndex = "1";
				return true;
			}
			return false;
		},
		animate_display_page_transition_setup_delay: function (d_page, position, animation_speed, animation_method, on_start, on_complete) {
			var self = this;

			// Un-ready
			d_page.animation.not_animated = false;
			d_page.animation.ready = false;
			d_page.animation.target.position = position;
			d_page.animation.target.animation.speed = animation_speed;
			d_page.animation.target.animation.method = animation_method;
			d_page.animation.target.on_start = on_start;
			d_page.animation.target.on_complete = on_complete;

			// Transition
			d_page.container.style[css.transition] = css2.transform + " " + animation_speed + "s " + animation_method + " 0s";

			// Clear timers
			for (var i = 0; i < d_page.animation.on_start_timers.length; ++i) {
				clearTimeout(d_page.animation.on_start_timers[i].timer);
			}
			d_page.animation.on_start_timers = [];

			// Timer
			if (d_page.animation.setup_timer != null) {
				clearTimeout(d_page.animation.setup_timer);
			}
			d_page.animation.setup_timer = setTimeout(function () {
				// Clear timer
				d_page.animation.setup_timer = null;

				this_private.animate_display_page_transition_ready.call(self,
					d_page
				);
			}, this.settings.transition_timeout);
		},
		animate_display_page_transition_ready: function (d_page) {
			// Set
			d_page.position = d_page.animation.target.position;
			d_page.animation.on_start = d_page.animation.target.on_start;
			d_page.animation.on_complete = d_page.animation.target.on_complete;
			d_page.animation.ready = true;
			d_page.animation.completed = false;

			// Flip
			d_page.container.style[css.transform] = "rotateY(" + d_page.position + "deg)";

			// Callback
			if (d_page.animation.on_start) {
				d_page.animation.on_start.call(this, d_page);
				d_page.animation.on_start = null;
			}
		},

		animate_display_page_add_delayed_action: function (d_page, action, delay) {
			var self = this;

			// Create timer handler
			var obj = {
				timer: null
			};
			obj.timer = setTimeout(function () {
				// Remove timer
				for (var i = 0; i < d_page.animation.on_start_timers.length; ++i) {
					if (obj == d_page.animation.on_start_timers[i]) {
						d_page.animation.on_start_timers.splice(i, 1);
						break;
					}
				}

				// Action
				action.call(self, d_page);
			}, d_page.animation.target.animation.speed * 1000 * delay);

			// Add
			d_page.animation.on_start_timers.push(obj);
		},

		set_display_page_size: function (d_page) {
			// Content
			var sides = [ "left" , "right" ];
			for (var j = 0; j < sides.length; ++j) {
				var s = d_page[sides[j]];

				for (var i = 0; i < s.images.length; ++i) {
					// Image size
					var w = s.images[i].content.size.width;
					var h = s.images[i].content.size.height;
					var scale = this.display_page_size.width / (s.images[i].two ? w / 2 : w);
					var sc = (this.display_page_size.height / h);
					var offset = 0;
					if (sc < scale) {
						scale = sc;
						offset = (this.display_page_size.width - w / 2 * scale);
					}
					w *= scale;
					h *= scale;

					s.images[i].image.style.backgroundSize = w + "px " + h + "px";
					if (s.images[i].two) {
						s.images[i].image.style.backgroundPosition = (s.images[i].first ^ s.images[i].left_to_right ? -w / 2 : offset) + "px center";
					}
				}
			}
		},
		set_display_page_content: function (d_page, d_page_side, page, fade_in_allowed, page_size_allowed) {
			d_page_side.page = page;

			// Remove all previous images
			for (var i = 0; i < d_page_side.images.length; ++i) {
				d_page_side.images[i].image.style.opacity = "0.0";
			}
			if (!this.settings.animation.image_fade.enabled) {
				while (d_page_side.images.length > 0) {
					this_private.on_display_page_image_fade_transition_end.call(this, d_page_side.images.image, null, d_page, d_page_side, obj);
				}
			}

			// Set new content
			if (d_page_side.page != null && d_page_side.page.content != null && !d_page_side.page.blank) {
				if (d_page_side.page.content.ready) {
					this_private.set_display_page_image.call(this, d_page, d_page_side, fade_in_allowed);
					if (page_size_allowed) this_private.set_display_page_size.call(this, d_page, d_page_side);
				}
				else if (!d_page_side.page.content.error) {
					d_page_side.page.content.custom.on_load_waiters.push([ d_page , d_page_side ]);
				}
			}
		},
		set_display_page_image: function (d_page, d_page_side, fade_in_allowed) {
			// Content
			if (d_page_side.page != null && d_page_side.page.content != null) {
				if (d_page_side.page.content.ready) {
					// Transition
					var transition = (fade_in_allowed && this.settings.animation.image_fade.enabled && (d_page_side.images.length > 0 || !this.settings.animation.image_fade.not_on_first));

					// Create new image
					var img = document.createElement("div");
					img.style.display = "block";
					img.style.position = "absolute";
					img.style.left = "0";
					img.style.top = "0";
					img.style.right = "0";
					img.style.bottom = "0";
					img.style.backgroundRepeat = "no-repeat";
					img.style.backgroundPosition = "center center";
					img.style.backgroundAttachment = "scroll";
					img.style.backgroundColor = "transparent";
					img.style.backgroundImage = "url(\"" + d_page_side.page.content.url + "\")";
					img.style[css.backfaceVisibility] = "hidden";
					if (transition) {
						img.style.opacity = "0.0";
					}

					// Events
					var img_obj = {
						image: img,
						content: d_page_side.page.content,
						two: d_page_side.page.two,
						first: d_page_side.page.first,
						event_list: [],
						left_to_right: this.settings.left_to_right
					};
					this_private.add_event_listener.call(this, img_obj.event_list, img, events.transitionend, function (event) {
						return this_private.on_display_page_image_fade_transition_end.call(self, this, event, d_page, d_page_side, img_obj);
					});

					// Add
					d_page_side.image_container.appendChild(img);
					d_page_side.images.push(img_obj);

					// Animation settings
					var self = this;
					setTimeout(function () {
						var a;
						var s = "";
						if ((a = self.settings.animation.page_resize).enabled) {
							s += (s.length > 0 ? ", " : "") + "background-size " + a.speed + "s " + a.method;
							s += (s.length > 0 ? ", " : "") + "background-position " + a.speed + "s " + a.method;
						}
						if ((a = self.settings.animation.image_fade).enabled) {
							s += (s.length > 0 ? ", " : "") + "opacity " + a.speed + "s " + a.method;
							setTimeout(function () {
								img.style.opacity = "1.0";
							}, self.settings.transition_timeout);
						}
						img.style[css.transition] = s;
					}, 1);

					// Finish
					if (!transition) {
						this_private.on_display_page_image_fade_transition_end.call(this, img, null, d_page, d_page_side, img_obj);
					}
				}
			}
		},

		update_screen_size: function () {
			// Container size
			var s;
			this.container_size.width = (parseFloat((s = this.zoom_container.style.width).substr(0, s.length - 1)) / 100 * this.html_container.offsetWidth) || this.zoom_container.offsetWidth;
			this.container_size.height = (parseFloat((s = this.zoom_container.style.height).substr(0, s.length - 1)) / 100 * this.html_container.offsetHeight) || this.zoom_container.offsetHeight;

			// Browser zoom
			var w = this.container_size.width;
			var h = this.container_size.height;
			this.browser_zoom_container.style.left = (w / -2) + "px";
			this.browser_zoom_container.style.top = (h / -2) + "px";
			this.browser_zoom_container.style.width = w + "px";
			this.browser_zoom_container.style.height = h + "px";

			// Page size
			this_private.update_page_size.call(this);
		},
		update_page_size: function () {
			var w = this.display_page_size.width;
			var h = this.display_page_size.height;

			var h_scale = (1.0 - this.settings.screen_padding.horizontal * 2.0);
			var v_scale = (1.0 - this.settings.screen_padding.vertical * 2.0);

			var disp = this_private.get_current_page_display.call(this);
			var pages = this.settings.aspect_ratio_page_count;
			if (pages != 1 && pages != 2) pages = (disp[0] == DISPLAY_TWO || disp[0] == DISPLAY_DOUBLE ? 2 : 1);

			if ((this.container_size.width * h_scale) / (this.container_size.height * v_scale) >= (this.settings.aspect_ratio * pages)) {
				// Page resize
				this.display_page_size.height = this.container_size.height * v_scale;
				this.display_page_size.width = this.display_page_size.height * this.settings.aspect_ratio;

				// Perspective change
				this.perspective_container.style[css.perspective] = (this.settings.perspective_scale * this.container_size.height) + "px";
			}
			else {
				// Page resize
				this.display_page_size.width = this.container_size.width * h_scale / pages;
				this.display_page_size.height = this.display_page_size.width / this.settings.aspect_ratio;

				// Perspective change
				this.perspective_container.style[css.perspective] = (this.settings.perspective_scale * this.container_size.width) + "px";
			}

			// Page size change
			this.perspective_container.style.width = this.display_page_size.width + "px";
			this.perspective_container.style.height = this.display_page_size.height + "px";

			if (w != this.display_page_size.width || h != this.display_page_size.height) {
				for (var i = 0; i < this.display_pages.length; ++i) {
					this_private.set_display_page_size.call(this, this.display_pages[i]);
				}
			}

			this_private.update_hinge_align.call(this);
		},
		update_hinge_align: function (new_align) {
			if (arguments.length > 0) this.hinge_align = new_align;

			switch (this.hinge_align) {
				case HINGE_ALIGN_LEFT:
					this.hinge_offset_container.style.left = (this.display_page_size.width / -2) + "px";
				break;
				case HINGE_ALIGN_CENTER:
					this.hinge_offset_container.style.left = "0px";
				break;
				case HINGE_ALIGN_RIGHT:
					this.hinge_offset_container.style.left = (this.display_page_size.width / 2) + "px";
				break;
			}
		},

		updage_page_list: function (start) {
			// Modify padding pages
			var changed = false;
			for (var i = start; i < this.pages.length; ++i) {
				if (this.pages[i].two && this.pages[i].first) {
					if (i > 0 && this.pages[i - 1].blank) {
						// Padded before
						if (!this.settings.display_two || this.settings.separate_double_page || this.settings.display_single_first != (i % 2 == 1)) {
							// Padding needs removed
							this_private.remove_page_from_list.call(this, this.pages[i - 1]);
							++i;
							changed = true;
						}
					}
					else {
						// Not padded before
						if (this.settings.display_two && !this.settings.separate_double_page && this.settings.display_single_first != (i % 2 == 1)) {
							// Padding needs added
							this_private.insert_page_into_list.call(this, i, {
								content: this.pages[i].content,
								first: true,
								two: false,
								blank: true
							});
							i += 2;
							changed = true;
						}
					}
				}
			}
			if (this.page_current >= this.pages.length) this.page_current = this.pages.length - 1;

			// Done
			return changed;
		},
		remove_page_from_list: function (page) {
			// Custom
			for (var i = 0; i < page.content.custom.true_pages.length; ++i) {
				if (page.content.custom.true_pages[i] == page) {
					page.content.custom.true_pages.splice(i, 1);
					break;
				}
			}

			// Standard
			for (var i = 0; i < this.pages.length; ++i) {
				if (this.pages[i] == page) {
					if (this.page_current > i) --this.page_current;

					this_private.shift_display_page_content_by.call(this, i, 1);

					this.pages.splice(i, 1);
					break;
				}
			}
		},
		insert_page_into_list: function (before_index, pg) {
			// Custom management
			pg.content.custom.true_pages.push(pg);

			// Standard
			if (this.page_current > before_index) ++this.page_current;
			this_private.shift_display_page_content_by.call(this, before_index, 1);
			this.pages.splice(before_index, 0, pg);
		},
		shift_display_page_content_by: function (index, shift_by) {
			for (var i = 0; i < this.display_pages.length; ++i) {
				var ind = { right:0 , left:0 };
				for (var side in ind) {
					if (this.display_pages[i][side].page == null) {
						ind[side] = -1;
						continue;
					}

					while (ind[side] < this.pages.length) {
						if (this.display_pages[i][side].page == this.pages[ind[side]]) break;
						++ind[side];
					}

					// Shift
					if (ind[side] >= index) {
						this_private.set_display_page_content.call(this,
							this.display_pages[i],
							this.display_pages[i][side],
							this.pages[ind[side] + shift_by],
							true,
							true
						);
					}
				}
			}

		},

		get_current_page_display: function () {
			// Get how many pages are being displayed, and which ones
			if (this.pages.length > 1) {
				if (this.settings.display_two) {
					if (this.settings.display_single_first) {
						if (this.page_current == 0) {
							return [ DISPLAY_FRONT , 0 ];
						}
						else if (this.pages.length % 2 == 0 && this.page_current == this.pages.length - 1) {
							return [ DISPLAY_BACK , this.page_current ];
						}
						else {
							var p = Math.floor((this.page_current - 1) / 2) * 2 + 1;
							return [ DISPLAY_TWO , p , p + 1 ];
						}
					}
					else {
						if (this.pages.length % 2 == 1 && this.page_current == this.pages.length - 1) {
							return [ DISPLAY_BACK , this.page_current ];
						}
						else {
							var p = Math.floor(this.page_current / 2) * 2;
							return [ DISPLAY_TWO , p , p + 1 ];
						}
					}
				}
				else {
					if (this.settings.separate_double_page) {
						return [ DISPLAY_ONE , this.page_current ];
					}
					else {
						if (this.pages[this.page_current].two) {
							var p = this.page_current - (this.pages[this.page_current].first ? 0 : 1);
							return [ DISPLAY_DOUBLE , p , p + 1 ];
						}
						else {
							return [ DISPLAY_ONE , this.page_current ];
						}
					}
				}
			}
			else {
				return [ DISPLAY_ONLY , 0 ];
			}
		},

		update_display_pages: function (previous_display, params) {
			var self = this;

			// Get settings
			var disp = this_private.get_current_page_display.call(this);
			var side_left = "left";
			var side_right = "right";
			var hinge_align_left = HINGE_ALIGN_LEFT;
			var hinge_align_right = HINGE_ALIGN_RIGHT;
			var hinge_align_center = HINGE_ALIGN_CENTER;
			var pos_left = POSITION_LEFT;
			var pos_right = POSITION_RIGHT;
			var dir = !this.settings.left_to_right;

			if (dir) {
				var temp = side_left;
				side_left = side_right;
				side_right = temp;

				temp = pos_left;
				pos_left = pos_right;
				pos_right = temp;

				temp = hinge_align_left;
				hinge_align_left = hinge_align_right;
				hinge_align_right = temp;
			}

			var page_ids = {};
			page_ids[side_left] = { left:null , right:null };
			page_ids[side_right] = { left:null , right:null };
			if (disp.length == 2) {
				page_ids[side_left][side_left] = this.pages[disp[1]];
				page_ids[side_right][side_right] = this.pages[disp[1]];
			}
			else {
				page_ids[side_left][side_left] = this.pages[disp[1]];
				page_ids[side_right][side_right] = this.pages[disp[2]];
			}

			// Fresh
			if (previous_display == null) {
				// Clear
				while (this.display_pages.length > 0) {
					this_private.destroy_display_page.call(this, this.display_pages[0]);
				}

				// Animation
				this.opening = true;

				// Completed function
				var immediate = (params && params.immediate);
				var new_pages = { left:null, right:null };
				var complete = function () {
					if (
						(new_pages.left == null || new_pages.left.animation.completed || new_pages.left.animation.not_animated) &&
						(new_pages.right == null || new_pages.right.animation.completed || new_pages.left.animation.not_animated)
					) {
						this.opening = false;
					}
				};

				// Fresh open
				switch (disp[0]) {
					case DISPLAY_FRONT:
					case DISPLAY_ONE:
					case DISPLAY_ONLY:
					{
						// Align
						this_private.update_hinge_align.call(this, hinge_align_left);

						// Main pages
						new_pages[side_right] = this_private.create_display_page.call(this, {
							page: page_ids[side_right],
							position: (immediate ? pos_right : POSITION_FRONT),
							order: side_right,
							animation: {
								position: pos_right,
								animation: this.settings.animation.page_open,
								on_complete: complete
							}
						});
					}
					break;
					case DISPLAY_BACK:
					{
						// Align
						this_private.update_hinge_align.call(this, hinge_align_right);

						// Main pages
						new_pages[side_left] = this_private.create_display_page.call(this, {
							page: page_ids[side_left],
							position: (immediate ? pos_left : POSITION_FRONT),
							order: side_left,
							animation: {
								position: pos_left,
								animation: this.settings.animation.page_open,
								on_complete: complete
							}
						});
					}
					break;
					case DISPLAY_TWO:
					case DISPLAY_DOUBLE:
					{
						// Align
						this_private.update_hinge_align.call(this, hinge_align_center);

						// Main pages
						new_pages[side_left] = this_private.create_display_page.call(this, {
							page: page_ids[side_left],
							position: (immediate ? pos_left : POSITION_FRONT),
							order: side_left,
							animation: {
								position: pos_left,
								animation: this.settings.animation.page_open,
								on_complete: complete
							}
						});

						new_pages[side_right] = this_private.create_display_page.call(this, {
							page: page_ids[side_right],
							position: (immediate ? pos_right : POSITION_FRONT),
							order: side_right,
							animation: {
								position: pos_right,
								animation: this.settings.animation.page_open,
								on_complete: complete
							}
						});
					}
					break;
				}

				// Immediate
				if (immediate) {
					complete.call();
				}
			}
			// Flipping
			else {
				// Change page size?
				if (
					(this.settings.aspect_ratio_page_count != 1 && this.settings.aspect_ratio_page_count != 2) &&
					(previous_display[0] == DISPLAY_TWO || previous_display[0] == DISPLAY_DOUBLE) !=
					(disp[0] == DISPLAY_TWO || disp[0] == DISPLAY_DOUBLE)
				) {
					this_private.update_page_size.call(this);
				}

				// Flip
				var flip_forward = (previous_display != null && disp[1] > previous_display[1]);
				if (params && "flip_forward" in params) flip_forward = params.flip_forward;

				// Target parameters
				var target_alphas = { left:null , right:null , flip:null };
				var flip_page_pos_target = pos_left;
				var flip_index = -1;
				var flip_backface = -1;
				var new_page_side, new_page_content_side, new_page_pos, flip_backface_side;
				var new_page_to_be_flipped = false;
				var new_page_opacity = 1.0;
				var new_page_opacity_target = 1.0;
				var hinge_align_target = hinge_align_center;
				var on_start2 = null;
				var on_start3 = null;
				var on_start = function (d_page) {
					this_private.animate_display_page_add_delayed_action.call(this,
						d_page,
						function () {
							this_private.update_hinge_align.call(this, hinge_align_target);
						},
						0.5
					);
					if (on_start2 != null) {
						on_start2.call(this, d_page);
					}
					if (on_start3 != null) {
						on_start3.call(this, d_page);
					}
				};
				if (flip_forward) {
					new_page_side = side_right;
					new_page_content_side = side_right;
					new_page_pos = pos_right;
					flip_backface_side = side_left;
				}
				else {
					new_page_side = side_left;
					new_page_content_side = side_left;
					new_page_pos = pos_left;
					flip_backface_side = side_right;
				}


				// Display method
				switch (disp[0]) {
					case DISPLAY_ONE:
					case DISPLAY_ONLY:
					{
						hinge_align_target = hinge_align_left;

						if (flip_forward) {
							flip_backface = -2;

							if (previous_display[0] != DISPLAY_ONE && previous_display[0] != DISPLAY_ONLY) {
								target_alphas[side_left] = 0;
							}

							target_alphas.flip = 1;
							for (var i = 0; i < this.display_pages.length; ++i) {
								if (
									this.display_pages[i][side_right].page == page_ids.right.right
								) {
									flip_page_pos_target = pos_left;
									flip_index = i + (dir ? 1 : -1);
									break;
								}
							}

							on_start2 = function (d_page) {
								this_private.animate_display_page_add_delayed_action.call(this,
									d_page,
									function (d_page) {
										d_page.opacity_container.style.opacity = "0";
									},
									0.5
								);
							};

						}
						else {
							flip_backface = -2;
							flip_page_pos_target = pos_right;

							for (var i = 0; i < this.display_pages.length; ++i) {
								if (
									this.display_pages[i][side_right].page == page_ids.right.right
								) {
									flip_page_pos_target = pos_right;
									flip_index = i;
									target_alphas.flip = 1.0;
									break;
								}
							}

							if (flip_index < 0) {
								if (previous_display[0] != DISPLAY_ONE && previous_display[0] != DISPLAY_ONLY) {
									flip_index = (dir ? this.display_pages.length - 1 : 0);
									flip_backface = flip_index;
									target_alphas.flip = 1.0;
								}
								else {
									new_page_content_side = side_right;
									new_page_side = side_left;
									new_page_pos = pos_left;
									new_page_to_be_flipped = true;
									new_page_opacity = 0.0;
								}
							}
						}
					}
					break;
					case DISPLAY_FRONT:
					{
						hinge_align_target = hinge_align_left;

						flip_page_pos_target = pos_right;
						target_alphas[side_left] = 0;

						for (var i = 0; i < this.display_pages.length; ++i) {
							if (
								this.display_pages[i][side_right].page == page_ids.right.right
							) {
								flip_page_pos_target = pos_right;
								flip_index = i;
								break;
							}
						}

						if (flip_index < 0) {
							flip_index = ((dir ^ flip_forward) ? this.display_pages.length - 1 : 0);
							flip_backface = flip_index;
							flip_backface_side = side_right;
						}
					}
					break;
					case DISPLAY_BACK:
					{
						hinge_align_target = hinge_align_right;

						for (var i = 0; i < this.display_pages.length; ++i) {
							if (
								this.display_pages[i][side_left].page == page_ids.left.left
							) {
								flip_index = i;
								flip_backface = i;
								break;
							}
						}

						flip_page_pos_target = pos_left;
						target_alphas[side_right] = 0;

						if (flip_index < 0) {
							flip_index = ((dir ^ flip_forward) ? this.display_pages.length - 1 : 0);
							flip_backface = flip_index;
						}
					}
					break;
					case DISPLAY_TWO:
					case DISPLAY_DOUBLE:
					{
						hinge_align_target = hinge_align_center;

						flip_page_pos_target = (flip_forward ? pos_left : pos_right);

						for (var i = 0; i < this.display_pages.length - 1; ++i) {
							if (
								this.display_pages[i].left.page == page_ids.left.left &&
								this.display_pages[i + 1].right.page == page_ids.right.right
							) {
								flip_index = i + ((dir ^ flip_forward) ? 0 : 1);
								flip_backface = flip_index;
								break;
							}
						}

						if (flip_index < 0 && !flip_forward && (previous_display[0] == DISPLAY_ONE || previous_display[0] == DISPLAY_ONLY)) {
							new_page_content_side = side_left;
							new_page_side = side_left;
							new_page_pos = pos_left;
							new_page_opacity = 0.0;

							var i = (dir ? this.display_pages.length - 1 : 0);
							if (
								this.display_pages[i][side_right].page == page_ids[side_right][side_right]
							) {
								target_alphas.flip = 1.0;
								break;
							}
							else {
								// New page
								var temp_p1 = this_private.create_display_page.call(this, {
									page: page_ids[side_right],
									position: new_page_pos,
									order: new_page_side,
									opacity: 0.0
								});
								on_start2 = function () {
									temp_p1.opacity_container.style.opacity = "1";
								};
							}
						}
					}
					break;
				}


				// Create (if necessary)
				if (flip_index < 0) {
					// New page
					var p1i = (new_page_side == "left" ? 0 : this.display_pages.length);
					var p1 = this_private.create_display_page.call(this, {
						page: page_ids[new_page_content_side],
						position: new_page_pos,
						order: new_page_side,
						opacity: new_page_opacity
					});
					// Pre-existing page
					var p2i = (new_page_side == "left" ? p1i + 1 : p1i - 1);
					var p2 = this.display_pages[p2i];

					// Target opacity
					if (new_page_opacity != new_page_opacity_target) {
						on_start3 = function () {
							p1.opacity_container.style.opacity = new_page_opacity_target;
						};
					}

					// Index
					flip_index = (new_page_to_be_flipped ? p1i : p2i);
					if (flip_backface == -1) flip_backface = flip_index;
				}
				if (flip_backface >= 0) {
					// Set backface
					this_private.set_display_page_content.call(this,
						this.display_pages[flip_backface],
						this.display_pages[flip_backface][flip_backface_side],
						page_ids[flip_backface_side][flip_backface_side],
						false,
						true
					);
				}

				// Flip to left
				var i;
				for (i = 0; i < flip_index; ++i) {
					if (target_alphas.left != null) {
						this.display_pages[i].opacity_container.style.opacity = target_alphas.left;
					}
					this_private.animate_display_page.call(this,
						this.display_pages[i],
						{
							position: POSITION_LEFT,
							animation: this.settings.animation.page_flip
						}
					);
				}
				// Flip to ?
				i = flip_index;
				if (target_alphas.flip != null) {
					this.display_pages[i].opacity_container.style.opacity = target_alphas.flip;
				}
				if (!this_private.animate_display_page.call(this,
					this.display_pages[i],
					{
						position: flip_page_pos_target,
						animation: this.settings.animation.page_flip,
						on_start: on_start
					}
				) && on_start != null) {
					on_start.call(this, this.display_pages[i]);
				}
				// Flip to right
				for (i = flip_index + 1; i < this.display_pages.length; ++i) {
					if (target_alphas.right != null) {
						this.display_pages[i].opacity_container.style.opacity = target_alphas.right;
					}
					this_private.animate_display_page.call(this,
						this.display_pages[i],
						{
							position: POSITION_RIGHT,
							animation: this.settings.animation.page_flip
						}
					);
				}
			}
		},
	};

	p.prototype = {
		constructor: p,

		open: function (params) {
			if (this.opened || this.opening || this.closing || this.pages.length == 0) return;

			this.opened = true;

			var p = null;
			if (params && params.immediate) {
				p = {
					immediate: true
				};
			}
			this_private.update_display_pages.call(this, p);
		},
		close: function (params) {
			if (!this.opened || this.opening || this.closing) return;

			this.opened = false;

			if (params && params.immediate) {
				while (this.display_pages.length > 0) {
					this_private.destroy_display_page.call(this, this.display_pages[0]);
				}
			}
			else {
				this.closing = true;

				var on_complete = function (d_page) {
					this_private.destroy_display_page.call(this, d_page);
					if (this.display_pages.length == 0) {
						this.closing = false;
					}
				};

				for (var i = 0; i < this.display_pages.length; ++i) {
					this_private.animate_display_page.call(this,
						this.display_pages[i],
						{
							position: POSITION_FRONT,
							animation: this.settings.animation.page_close,
							on_complete: on_complete
						}
					);
				}
			}
		},
		advance: function () {
			if (this.opening || this.closing) return;

			var page = this.page_current;

			var disp = this_private.get_current_page_display.call(this);
			switch (disp[0]) {
				case DISPLAY_FRONT:
				{
					++this.page_current;
				}
				break;
				case DISPLAY_ONE:
				{
					if (disp[1] == this.pages.length - 1) break; // cannot advance

					++this.page_current;
				}
				break;
				case DISPLAY_TWO:
				case DISPLAY_DOUBLE:
				{
					if (disp[2] == this.pages.length - 1) break; // cannot advance

					// Go to the next even page
					this.page_current = disp[2] + 1;
				}
				break;
				case DISPLAY_BACK: // cannot advance
				case DISPLAY_ONLY: // cannot advance
				break;
			}

			// Change page
			if (page != this.page_current) {
				this_private.update_display_pages.call(this, disp);
			}
		},
		backtrack: function () {
			if (this.opening || this.closing) return;

			var page = this.page_current;

			var disp = this_private.get_current_page_display.call(this);
			switch (disp[0]) {
				case DISPLAY_BACK:
				{
					--this.page_current;
				}
				break;
				case DISPLAY_TWO:
				{
					if (disp[1] == 0) break; // cannot backtrack

					// Go back at most 2 pages
					this.page_current = Math.max(0, disp[1] - 2);
				}
				break;
				case DISPLAY_ONE:
				case DISPLAY_DOUBLE:
				{
					if (disp[1] == 0) break; // cannot backtrack

					// Go back at most 2 pages
					var count = 1;
					if (this.pages[disp[1] - count].two && !this.settings.separate_double_page) {
						++count;
					}
					this.page_current = Math.max(0, disp[1] - count);
				}
				break;
				case DISPLAY_FRONT: // cannot backtrack
				case DISPLAY_ONLY: // cannot backtrack
				break;
			}

			// Change page
			if (page != this.page_current) {
				this_private.update_display_pages.call(this, disp);
			}
		},
		destroy: function () {
			if (this.html_container.parentNode != null) {
				this.html_container.parentNode.removeChild(this.html_container);
			}
			while (this.display_pages.length > 0) {
				this_private.destroy_display_page.call(this, this.display_pages[0]);
			}
			for (var event in this.contents_events) {
				this.contents.off(event, this.contents_events[event]);
			}
			for (var i = 0; i < this.contents.length; ++i) {
				if ("custom" in this.contents.get(i)) {
					delete this.contents.get(i)["custom"];
				}
			}

			this_private.remove_event_listeners.call(this, this.event_list);
			this.event_list = [];
		},

		set: function (params) {
			var page_display_changed = false;
			var disp = this_private.get_current_page_display.call(this);
			var changed = false;
			var page_size_changed = false;

			// Aspect ratio
			if ("aspect_ratio" in params && typeof(params.aspect_ratio) == number_type) {
				this.settings.aspect_ratio = params.aspect_ratio;

				page_size_changed = true;
			}
			if ("aspect_ratio_page_count" in params && typeof(params.aspect_ratio_page_count) == number_type) {
				this.settings.aspect_ratio_page_count = params.aspect_ratio_page_count;

				page_size_changed = true;
			}

			// HTML
			if ("binding_fix" in params && typeof(params.binding_fix) == bool_type) {
				if (this.settings.binding_fix != params.binding_fix) {
					this.settings.binding_fix = params.binding_fix;

					var sides = [ "left" , "right" ];
					for (var j = 0; j < this.display_pages.length; ++j) {
						for (var i = 0; i < sides.length; ++i) {
							var s = this.display_pages[j][sides[i]];

							// Image
							if (this.settings.binding_fix) {
								s.image_container.style.left = (i == 1 ? "0.375px" : "-0.375px"); // to prevent a 1px offset in firefox
								s.image_container.style.right = (i == 0 ? "-0.375px" : "0.375px");
							}
							else {
								s.image_container.style.left = "0";
								s.image_container.style.right = "0";
							}
						}
					}
				}
			}
			if ("perspective_scale" in params && typeof(params.perspective_scale) == number_type) {
				this.settings.perspective_scale = params.perspective_scale;

				page_size_changed = true;
			}
			if ("screen_padding" in params) {
				if ("horizontal" in params.screen_padding && typeof(params.screen_padding.horizontal) == number_type) {
					this.settings.screen_padding.horizontal = params.screen_padding.horizontal;

					page_size_changed = true;
				}
				if ("vertical" in params.screen_padding && typeof(params.screen_padding.vertical) == number_type) {
					this.settings.screen_padding.vertical = params.screen_padding.vertical;

					page_size_changed = true;
				}
			}
			if ("page_background_color" in params) {
				if ("left" in params.page_background_color && typeof(params.page_background_color.left) == string_type) {
					this.settings.page_background_color.left = params.page_background_color.left;

					for (var i = 0; i < this.display_pages.length; ++i) {
						this.display_pages[i].left.container.style.background = this.settings.page_background_color.left;
					}
				}
				if ("right" in params.page_background_color && typeof(params.page_background_color.right) == string_type) {
					this.settings.page_background_color.right = params.page_background_color.right;

					for (var i = 0; i < this.display_pages.length; ++i) {
						this.display_pages[i].right.container.style.background = this.settings.page_background_color.right;
					}
				}
			}

			// CSS transition settings
			if ("transition_timeout" in params && typeof(params.transition_timeout) == number_type) {
				this.settings.transition_timeout = params.transition_timeout;
			}

			// CSS animations
			if ("animation" in params) {
				for (var key in this.settings.animation) {
					if (key in params.animation) {
						for (var subkey in this.settings.animation[key]) {
							if (subkey in params.animation[key] && typeof(params.animation[key][subkey]) == typeof(this.settings.animation[key][subkey])) {
								params.animation[key][subkey] = this.settings.animation[key][subkey];
							}
						}
					}
				}
			}

			// Display method changes
			if ("display_two" in params && typeof(params.display_two) == bool_type && this.settings.display_two != params.display_two) {
				page_display_changed = true;

				this.settings.display_two = params.display_two;
			}
			if ("display_single_first" in params && typeof(params.display_single_first) == bool_type && this.settings.display_single_first != params.display_single_first) {
				page_display_changed = true;

				this.settings.display_single_first = params.display_single_first;
			}
			if ("separate_double_page" in params && typeof(params.separate_double_page) == bool_type && this.settings.separate_double_page != params.separate_double_page) {
				page_display_changed = true;

				this.settings.separate_double_page = params.separate_double_page;
			}
			if ("left_to_right" in params && typeof(params.left_to_right) == bool_type && this.settings.left_to_right != params.left_to_right) {
				page_display_changed = true;

				this.settings.left_to_right = params.left_to_right;
				changed = true;
			}

			// Update display
			if (page_size_changed) {
				this_private.update_page_size.call(this);
			}
			if (page_display_changed) {
				// Display changes
				var disp_new = this_private.get_current_page_display.call(this);

				changed = this_private.updage_page_list.call(this, 0) || changed || (disp_new.length != disp.length);
				if (!changed) {
					for (var i = 0; i < disp.length; ++i) {
						if (disp[i] != disp_new[i]) {
							changed = true;
							break;
						}
					}
				}

				if (changed) {
					this_private.update_display_pages.call(this, disp, {flip_forward:true});
				}
			}
		},

		set_zoom: function (factor) {
			this.zoom_factor = factor;

			this.zoom_container.style.width = (this.zoom_factor * 100) + "%";
			this.zoom_container.style.height = (this.zoom_factor * 100) + "%";
			this.zoom_container.style.left = (this.zoom_factor * -50) + "%";
			this.zoom_container.style.top = (this.zoom_factor * -50) + "%";
			this.zoom_container_offset_size.style.width = Math.max(0, (this.zoom_factor - 1) / this.zoom_factor * 100) + "%";
			this.zoom_container_offset_size.style.height = Math.max(0, (this.zoom_factor - 1) / this.zoom_factor * 100) + "%";

			this_private.update_screen_size.call(this);
		},
		get_zoom: function () {
			return this.zoom_factor;
		},
		set_position: function (x_factor, y_factor) {
			this.zoom_location.x = x_factor;
			this.zoom_location.y = y_factor;

			this.zoom_container_offset.style.left = (50 - this.zoom_location.x * 100).toFixed(2) + "%";
			this.zoom_container_offset.style.top = (50 - this.zoom_location.y * 100).toFixed(2) + "%";
		},
		get_position: function () {
			return {
				x: this.zoom_location.x,
				y: this.zoom_location.y
			};
		},

		trigger_resize: function () {
			this_private.update_screen_size.call(this);
		},
	};

	return p;

})();

