
function E(elem) {
	return $(document.createElement(elem || "div"));
}

function order_files(files) {
	var f = [];
	for (var i = 0; i < files.length; ++i) {
		f.push(files[i]);
	}
	return f;
}
function load_files(cache, pages, files) {
	// Remove pages
	cache.remove_all();

	// Load pages
	for (var i = 0; i < files.length; ++i) {
		var url = (window.webkitURL || window.URL).createObjectURL(files[i]);
		cache.add({
			url: url,
			name: files[i].name
		});
	}

	// Open
	pages.open();
}

$(document).ready(function () {

	// Contents
	var c = new ContentCache({double_detection:true});

	// Events
	c.on("add", function (data) {
		if (data.context != null) return;

		var content = data.content;
		var container = $(".pages_list_container");
		var fname, ext;
		if (content.name.indexOf(".") < 0) {
			fname = content.name;
			ext = "";
		}
		else {
			fname = content.name.split(".");
			ext = "." + fname.pop();
			fname = fname.join(".");
		}

		content.html_extra = {
			object: null
		};

		container.append(
			(content.html_extra.object = E("label"))
			.addClass("pages_list_page")
			.html(
				E()
				.append(
					E()
					.addClass("custom_checkbox")
					.append(
						E("input")
						.attr("type", "checkbox")
						.attr("checked", "checked")
						.on("change", function () {
							if (!$(this).is(":checked")) c.remove(content);
						})
					)
					.append(E().html(E()))
				)
				.append(E("span").html(fname))
				.append(E("span").html(ext))
			)
		);

		if (data.content.two) {
			data.content.html_extra.object.addClass("two");
		}
	})
	.on("remove", function (data) {
		if (data.context != null) return;

		data.content.html_extra.object.remove();

		// Remove
		delete data.content["html_extra"];
	})
	.on("change", function (data) {
		if (data.context != null) return;

		if (data.change == "two") {
			if (data.content.two) {
				data.content.html_extra.object.addClass("two");
			}
			else {
				data.content.html_extra.object.removeClass("two");
			}
		}
	});

	// Create and add
	var p_create = function () {
		return new Pages({//debug:true,
			contents: c,
			container: $(".pages_container")[0],
			separate_double_page: $(".pages_options_panel > .option input[type=checkbox][name=separate_double_page]").is(":checked"),
			display_single_first: $(".pages_options_panel > .option input[type=checkbox][name=display_single_first]").is(":checked"),
			display_two: $(".pages_options_panel > .option input[type=checkbox][name=display_two]").is(":checked"),
			left_to_right: $(".pages_options_panel > .option input[type=checkbox][name=left_to_right]").is(":checked")
		});
	};
	var p = p_create();

	// Content
	c.add({
		url: "1.png"
	});
	c.add({
		url: "2.jpg"
	});
	c.add({
		url: "3.jpg"
	});
	c.add({
		url: "4.jpg"
	});
	c.add({
		url: "5.png"
	});
	c.add({
		url: "D.png",
		two: true
	});

	// Open
	p.open();


	// Dark
	if ($(".pages_options_panel > .option input[type=checkbox][name=dark]").is(":checked")) {
		$("body").addClass("dark");
	}

	// Zooming
	$(window)
	.on("keydown", function (event) {
		if (!(event.which >= 16 && event.which <= 18)) {
			var flags = (event.shiftKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.altKey ? 4 : 0);

			// Not typing
			var t = $(document.activeElement).prop("tagName").toLowerCase();
			if (t !== "input" && t !== "textarea") {
				// Hotkey loop
				switch (event.which) {
					case 37: // left
					case 65: // A
						p.backtrack();
					break;
					case 38: // up
					case 87: // W
					break;
					case 39: // right
					case 68: // D
						p.advance();
					break;
					case 40: // down
					case 83: // S
					break;
				}
			}
		}
		return true;
	})
	.on("mousemove", function (event) {
		p.set_position(
			Math.max(0.0, Math.min(1.0, (event.pageX - 64) / ($(window).width() - 64 * 2))),
			Math.max(0.0, Math.min(1.0, (event.pageY - 64) / ($(window).height() - 64 * 2)))
		);
	})
	.on("mousewheel DOMMouseScroll", function (event) {
		if (!event.ctrlKey) {
			// Zoom
			var delta = Math.max(-1, Math.min(1, (event.originalEvent.wheelDelta || -event.originalEvent.detail)));

			p.set_zoom(Math.max(1, p.get_zoom() + delta));

			return false;
		}
		return true;
	});

	// Controls
	$(".pages_options_panel > .option input[type=checkbox]")
	.on("change", function (event) {
		if ($(this).attr("name") == "dark") {
			if ($(this).is(":checked")) {
				$("body").addClass("dark");
			}
			else {
				$("body").removeClass("dark");
			}
		}
		else if ($(this).attr("name") != "immediate" && $(".pages_options_panel > .option input[type=checkbox][name=immediate]").is(":checked")) {
			var o = {};
			o[$(this).attr("name")] = $(this).is(":checked");
			p.set(o);
		}
	});

	$(".pages_options_panel > button.option[name=reopen]")
	.on("click", function (event) {
		if (p != null) p.destroy();
		p = p_create();
		p.open();
	});

	$(".pages_options_panel > button.option[name=close]")
	.on("click", function (event) {
		p.close();
	});

	// Drag and drop
	var o = $(".drag_drop_message > div > div");
	o.css({
		width: o.width() + "px",
		height: o.height() + "px",
		left: (-o.width() / 2) + "px",
		top: (-o.height() / 2) + "px"
	});
	$(".drag_drop_message").addClass("ready").on("click", function () {
		$(this).removeClass("enabled");
	});
	$("body")
	.on("dragover", function (event) {
		event.originalEvent.dataTransfer.dropEffect = "move";
		return false;
	})
	.on("dragenter", function (event) {
		$(".drag_drop_message").addClass("enabled");
		return false;
	})
	.on("dragexit", function (event) {
		$(".drag_drop_message").removeClass("enabled");
		return false;
	})
	.on("drop", function (event) {
		$(".drag_drop_message").removeClass("enabled");

		var f = event.originalEvent.dataTransfer.files;
		if (f.length > 0) {
			f = order_files(f);
			load_files(c, p, f);
		}

		return false;
	});

});

