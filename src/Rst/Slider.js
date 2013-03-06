/*
 * Copyright MADE/YOUR/DAY OG <mail@madeyourday.net>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Rst.Slider Class
 */
Rst.Slider = (function() {

	/**
	 * Rst.Slider Constructor
	 * @param jQuery element slider element
	 * @param object options options see this.defaultOptions
	 */
	function Slider(element, options) {

		var self = this;
		var size;

		this.slides = [];
		this.elements = {};
		this.slideIndex = 0;

		this.elements.main = element;
		this.options = $.extend({}, this.defaultOptions, options);

		if (this.options.width === 'auto' && this.options.direction === 'x') {
			throw new Error('width "auto" with direction "x" ist not possible');
		}
		else if (this.options.height === 'auto' && this.options.direction === 'y') {
			throw new Error('height "auto" with direction "y" ist not possible');
		}

		this.checkCss3Support();
		this.readSlides();

		if (this.options.random) {
			this.slides.sort(function() {
				return Math.random() - 0.5;
			});
		}

		this.elements.main
			.addClass(this.options.cssPrefix + 'main')
			.addClass(this.options.cssPrefix + 'direction-' + this.options.direction)
			.addClass(this.options.cssPrefix + 'type-' + this.options.type)
			.addClass(this.options.cssPrefix + 'skin-' + this.options.skin)
			.css({
				width: this.options.width,
				height: this.options.height
			});
		this.elements.view = $(document.createElement('div'))
			.addClass(this.options.cssPrefix + 'view')
			.appendTo(this.elements.main);
		this.elements.slides = $(document.createElement('div'))
			.addClass(this.options.cssPrefix + 'slides')
			.appendTo(this.elements.view);

		this.nav = new Rst.SliderNav(this);
		this.nav.setActive(this.slideIndex);

		this.preloadSlides(0);
		size = this.getViewSize();
		$(window).on('resize.rsts', function(){
			self.resize();
		});
		this.resize();

		if (this.options.type === 'slide') {
			this.setDragEvents();
		}
		else {
			this.modify(this.slides[this.slideIndex].element, {opacity: 1});
		}

		if (this.css3Supported) {
			this.elements.slides.on(
				'transitionend webkitTransitionEnd oTransitionEnd msTransitionEnd',
				function() {
					self.cleanupSlides();
				}
			);
		}

	}

	/**
	 * @var object default options
	 */
	Slider.prototype.defaultOptions = {
		// slider type (slide or fade)
		type: 'slide',
		// "x" for horizontal or "y" for vertical
		direction: 'x',
		// if true the slides get shuffled once on initialization
		random: false,
		// prefix for all RockSolid Slider specific css class names
		cssPrefix: 'rsts-',
		// slider skin (set this to "none" to disable the default skin)
		skin: 'default',
		// width
		width: '100%',
		// height
		height: '100%',
		// number of slides to preload (to the left/right or top/bottom)
		preloadSlides: 3,
		// gap between the slides
		gapSize: 20,
		// duration of the slide animation in milliseconds
		duration: 400,
		// false or the duration between slides in milliseconds
		autoplay: false,
		// false or the duration between user interaction and autoplay
		// (must be bigger than autoplay)
		autoplayRestart: 8000,
		// navigation type (bullets, numbers, tabs)
		navType: 'bullets',
		// image scale mode (fit, crop, scale)
		scaleMode: 'crop'
	};

	/**
	 * slides to a specific slide
	 * @param number index slide index
	 */
	Slider.prototype.goTo = function(index, fromDrag, fromAutoplay) {

		if (!fromAutoplay) {
			this.stopAutoplay();
		}

		var overflow = false;

		if (index < 0 || index > this.slides.length - 1) {
			if (this.options.type === 'fade') {
				return;
			}
			overflow = true;
			index = index < 0 ? 0 : this.slides.length - 1;
		}

		if (! overflow && this.slideIndex === index && ! fromDrag) {
			return;
		}

		this.slideIndex = index;
		if (
			fromDrag &&
			this.slides[index].element.get(0).parentNode &&
			this.slides[index].element.get(0).parentNode.tagName
		) {
			// performance optimization
			this.preloadOnCleanup = true;
		}
		else {
			console.debug(this.slides[index].element.get(0).parentNode);
			this.preloadSlides(index);
		}

		this.nav.setActive(index);

		var size = this.getViewSize(index);
		var durationScale;

		if (fromDrag && !overflow) {
			durationScale = Math.abs((
				this.getOffset(this.elements.slides) -
				((size[this.options.direction] + this.options.gapSize) * -index)
			) / (size[this.options.direction] + this.options.gapSize));
		}
		else if (fromDrag && overflow) {
			durationScale = 0.7;
		}

		if (this.options.type === 'slide') {
			this.modify(this.elements.slides, {
				offset: (size[this.options.direction] + this.options.gapSize) * -index
			}, true, durationScale, fromDrag, overflow && !fromDrag);
		}
		else if (this.options.type === 'fade') {
			this.modify(this.slides[this.slideIndex].element, {opacity: 1}, true);
		}

		if (this.options.height === 'auto' || this.options.width === 'auto') {
			this.modify(this.elements.view, {
				width: size.x,
				height: size.y
			}, true, durationScale, fromDrag);
		}

	};

	/**
	 * stops/restarts autoplay
	 */
	Slider.prototype.stopAutoplay = function() {

		var self = this;

		clearTimeout(this.autoplayTimeout);
		clearInterval(this.autoplayInterval);

		if (this.options.autoplayRestart) {
			this.autoplayTimeout = setTimeout(function() {
				self.autoplay();
			}, this.options.autoplayRestart - this.options.autoplay);
		}

	};

	/**
	 * starts autoplay
	 * @param boolean restart true if autoplay should be restarted
	 */
	Slider.prototype.autoplay = function() {

		var self = this;

		if (!this.options.autoplay) {
			return;
		}

		var intervalFunction = function() {
			var index = self.slideIndex + 1;
			if (index > self.slides.length - 1) {
				index = 0;
			}
			self.goTo(index, false, true);
		};

		this.autoplayTimeout = setTimeout(function() {
			intervalFunction();
			self.autoplayInterval = setInterval(intervalFunction, self.options.autoplay);
		}, this.options.autoplay - this.options.duration);

	};

	/**
	 * check support for transition and transform/translate3d
	 * (to use hardware acceleration if possible)
	 */
	Slider.prototype.checkCss3Support = function() {

		var self = this;

		this.css3Supported = false;

		var el = document.createElement('div');
		document.body.appendChild(el);
		var style = el.style;
		var prefixes = ['Webkit', 'O', 'Moz', 'ms'];

		var transformsSupported = false;
		var transforms = {
			transform: 'transform'
		};
		$.each(prefixes, function(i, prefix){
			transforms[prefix + 'Transform'] = '-' + prefix.toLowerCase() + '-transform';
		});
		$.each(transforms, function(property, css){
			if (property in style) {
				style[property] = 'translate3d(0,0,0)';
				var computed = window.getComputedStyle(el).getPropertyValue(css);
				if (computed && computed !== 'none') {
					transformsSupported = true;
					return false;
				}
			}
		});

		document.body.removeChild(el);

		if (! transformsSupported) {
			return;
		}

		$.each(prefixes, function(i, prefix){
			if ('transition' in style || prefix + 'Transition' in style) {
				self.css3Supported = true;
				return;
			}
		});

	};

	/**
	 * modifies or animates a property of an element
	 * (using hardware acceleration if possible)
	 *
	 * @param jQuery element element to animate
	 * @param object css     property value pairs to animate
	 */
	Slider.prototype.modify = function(element, css, animate, durationScale, fromDrag, bounce) {

		var self = this;
		var origOffset;

		if (typeof durationScale !== 'number') {
			durationScale = 1;
		}

		if (typeof css.offset === 'number') {

			if (animate && bounce) {
				origOffset = css.offset;
				css.offset += this.slideSize * 0.075 * (css.offset ? -1 : 1);
				durationScale *= 0.5;
			}

			if (this.css3Supported) {
				css.transform = 'translate3d(';
				if (this.options.direction !== 'x') {
					css.transform += '0,';
				}
				css.transform += css.offset + 'px';
				if (this.options.direction === 'x') {
					css.transform += ',0';
				}
				css.transform += ',0)';
			}
			else {
				css[{x: 'left', y: 'top'}[this.options.direction]] = css.offset;
			}

			delete css.offset;

		}

		// stop animations
		element.stop();

		if (animate && this.css3Supported) {
			css['transition-timing-function'] = fromDrag ?
				'cubic-bezier(0.390, 0.575, 0.565, 1.000)' :
				'cubic-bezier(0.445, 0.050, 0.550, 0.950)';
			css['transition-duration'] = this.options.duration * durationScale + 'ms';
			element.css(css);
		}
		else if (animate) {
			element.animate(css, {
				duration: this.options.duration * durationScale,
				easing: fromDrag ? 'easeOutSine' : 'easeInOutSine',
				complete: element === this.elements.slides ? function() {
					self.cleanupSlides();
				} : null
			});
		}
		else if (this.css3Supported) {
			css['transition-duration'] = '';
			element.css(css);
		}
		else {
			element.css(css);
		}

		if (element.bounceTimeout) {
			clearTimeout(element.bounceTimeout);
		}
		if (animate && bounce) {
			element.bounceTimeout = setTimeout(function() {
				element.bounceTimeout = null;
				self.modify(element, {offset: origOffset}, animate, durationScale, fromDrag);
			}, this.options.duration * durationScale + 50);
		}

	};

	/**
	 * gets the offset on the options.direction axis
	 * (using hardware acceleration if possible)
	 *
	 * @param jQuery  element element
	 * @return number
	 */
	Slider.prototype.getOffset = function(element) {
		return element.position()[{x: 'left', y: 'top'}[this.options.direction]];
	};

	/**
	 * slides to the next slide
	 */
	Slider.prototype.next = function() {
		this.goTo(this.slideIndex + 1);
	};

	/**
	 * slides to the previous slide
	 */
	Slider.prototype.prev = function() {
		this.goTo(this.slideIndex - 1);
	};

	/**
	 * reads all slides from DOM and saves them to this.slides
	 * @return {[type]} [description]
	 */
	Slider.prototype.readSlides = function() {

		var self = this;

		this.elements.main.children().each(function() {
			self.slides.push(new Rst.Slide(this, self));
		});

		this.elements.main.empty();

	};

	/**
	 * injects Slide objects to the DOM
	 */
	Slider.prototype.preloadSlides = function(slideIndex) {

		var self = this;
		var preloadCount = this.options.type === 'slide' ?
			this.options.preloadSlides :
			0;
		var width, height;
		if (this.options.width !== 'auto') {
			width = this.elements.main.width();
		}
		if (this.options.height !== 'auto') {
			height = this.elements.main.height();
			height -= this.nav.getSize().y;
		}

		$.each(this.slides, function(i, slide) {
			if (i >= slideIndex - preloadCount && i <= slideIndex + preloadCount) {
				if (! slide.element.get(0).parentNode || ! slide.element.get(0).parentNode.tagName) {
					if (self.options.type === 'fade') {
						self.modify(slide.element, {opacity: 0});
					}
					self.elements.slides.append(slide.element);
					slide.size(width, height);
				}
				else if (
					self.options.type === 'fade' &&
					i === self.slideIndex &&
					slide.element.next().length
				) {
					if (slide.element.next().length === 1) {
						self.modify(slide.element, {opacity: 1 - slide.element.next().css('opacity')});
						self.modify(slide.element.next(), {opacity: 1});
					}
					else {
						self.modify(slide.element, {opacity: 0});
					}
					self.elements.slides.append(slide.element);
				}
				if (self.options.type === 'slide') {
					self.modify(slide.element, {
						offset: i * (
							(self.options.direction === 'x' ? width : height) +
							self.options.gapSize
						)
					});
				}
			}
		});

	};

	/**
	 * removes Slide objects from the DOM
	 */
	Slider.prototype.cleanupSlides = function() {

		var self = this;
		var preloadCount = this.options.type === 'slide' ?
			this.options.preloadSlides :
			0;

		$.each(this.slides, function(i, slide) {
			if (
				(i < self.slideIndex - preloadCount || i > self.slideIndex + preloadCount) &&
				slide.element.get(0).parentNode && slide.element.get(0).parentNode.tagName
			) {
				if (
					self.options.type === 'fade' &&
					self.slides[self.slideIndex].element.css('opacity') < 1
				) {
					return;
				}
				slide.element.detach();
			}
		});

		if (this.preloadOnCleanup) {
			this.preloadOnCleanup = false;
			this.preloadSlides(this.slideIndex);
		}

	};


	/**
	 * returns an object containing view width and height
	 * @return object {x: ..., y: ...}
	 */
	Slider.prototype.getViewSize = function(slideIndex) {

		var x, y, size;
		slideIndex = slideIndex || 0;

		if (this.options.width !== 'auto') {
			x = this.elements.main.width();
		}
		if (this.options.height !== 'auto') {
			y = this.elements.main.height();
			y -= this.nav.getSize().y;
		}

		if (x && y) {
			size = {
				x: x,
				y: y
			};
		}
		else {
			size = this.slides[slideIndex].size(x, y, true);
		}

		this.slideSize = size[this.options.direction];

		return size;

	};

	/**
	 * recalculates the size of the slider
	 */
	Slider.prototype.resize = function() {

		var self = this;
		var size, width, height;

		size = this.getViewSize(this.slideIndex);
		this.modify(this.elements.view, {
			width: size.x,
			height: size.y
		});

		if (this.options.width !== 'auto') {
			width = size.x;
		}
		if (this.options.height !== 'auto') {
			height = size.y;
		}

		$.each(this.slides, function(i, slide) {
			if (slide.element.get(0).parentNode && slide.element.get(0).parentNode.tagName) {
				slide.size(width, height);
				if (self.options.type === 'slide') {
					self.modify(slide.element, {
						offset: i * (
							(self.options.direction === 'x' ? width : height) +
							self.options.gapSize
						)
					});
				}
			}
		});
		if (this.options.type === 'slide') {
			this.modify(this.elements.slides, {
				offset: (size[this.options.direction] + self.options.gapSize) * -this.slideIndex
			});
		}

	};

	/**
	 * @return Rst.Slide[] all slides
	 */
	Slider.prototype.getSlides = function() {
		return this.slides;
	};

	/**
	 * detects mouse or touch events and adds the event handlers
	 */
	Slider.prototype.setDragEvents = function() {

		var self = this;

		var eventNames = {
			start: 'mousedown',
			stop: 'mouseup',
			move: 'mousemove',
			cancel: 'mouseup'
		};

		this.hasTouch = false;

		if (window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints) {
			eventNames = {
				start: 'MSPointerDown',
				stop: 'MSPointerUp',
				move: 'MSPointerMove',
				cancel: 'MSPointerUp'
			};
			this.hasTouch = true;
		}
		else if ('ontouchstart' in window || 'ontouchend' in document) {
			eventNames = {
				start: 'touchstart',
				stop: 'touchend',
				move: 'touchmove',
				cancel: 'touchcancel'
			};
			this.hasTouch = true;
		}

		this.elements.view.on(eventNames.start, function(event) {
			return self.onDragStart(event);
		});
		$(document).on(eventNames.stop + '.rsts', function(event) {
			return self.onDragStop(event);
		});
		$(document).on(eventNames.move + '.rsts', function(event) {
			return self.onDragMove(event);
		});
		$(document).on(eventNames.cancel + '.rsts', function(event) {
			return self.onDragStop(event);
		});

	};

	/**
	 * on drag start event
	 */
	Slider.prototype.onDragStart = function(event) {

		if ($(event.target).closest(
			'.no-drag,a,button,input,select,textarea',
			this.elements.slides
		).length) {
			return;
		}

		if (event.type === 'mousedown' && event.which !== 1) {
			return;
		}

		var pos = this.getPositionFromEvent(event);

		if (! this.hasTouch) {
			event.preventDefault();
			this.stopAutoplay();
		}

		this.elements.main.addClass(this.options.cssPrefix + 'dragging');

		this.isDragging = true;
		this.dragStartPos = {
			x: pos.x - this.elements.slides.offset().left + this.elements.view.offset().left,
			y: pos.y - this.elements.slides.offset().top + this.elements.view.offset().top
		};
		this.dragLastPos = this.dragStartPos[this.options.direction];
		this.dragLastDiff = 0;
		this.touchStartPos = pos;
		this.touchAxis = '';

		// stop current animation
		this.modify(this.elements.slides, {
			offset:
				pos[this.options.direction] -
				this.dragStartPos[this.options.direction]
		});

		this.onDragMove(event);

	};

	/**
	 * on drag stop event
	 */
	Slider.prototype.onDragStop = function(event) {

		if (! this.isDragging) {
			return;
		}

		this.isDragging = false;
		this.elements.main.removeClass(this.options.cssPrefix + 'dragging');

		var leftSlideIndex = Math.floor(
			this.getOffset(this.elements.slides) * -1 /
			(this.slideSize + this.options.gapSize)
		);

		if (this.dragLastDiff <= 0) {
			this.goTo(leftSlideIndex, true);
		}
		else {
			this.goTo(leftSlideIndex + 1, true);
		}

	};

	/**
	 * on drag move event
	 */
	Slider.prototype.onDragMove = function(event) {

		if (! this.isDragging) {
			return;
		}

		var pos = this.getPositionFromEvent(event);
		var diffAxis;

		if (this.hasTouch) {

			if (! this.touchAxis) {
				diffAxis =
					Math.abs(pos.x - this.touchStartPos.x) -
					Math.abs(pos.y - this.touchStartPos.y);
				if (diffAxis > 4) {
					this.touchAxis = 'x';
				}
				else if (diffAxis < -4) {
					this.touchAxis = 'y';
				}
			}

			if (this.touchAxis === this.options.direction) {
				event.preventDefault();
				this.stopAutoplay();
			}
			else if (! this.touchAxis) {
				return;
			}
			else {
				return this.onDragStop();
			}

			// multiple touches
			if (event.originalEvent.touches && event.originalEvent.touches[1]) {
				return this.onDragStop();
			}

		}
		else {
			event.preventDefault();
			this.stopAutoplay();
		}

		var posDiff = this.dragLastPos - pos[this.options.direction];
		var slidesPos =
			pos[this.options.direction] -
			this.dragStartPos[this.options.direction];

		if (slidesPos > 0) {
			slidesPos *= 0.4;
		}
		if (slidesPos <
			(- this.slideSize - this.options.gapSize) *
			(this.slides.length - 1)
		) {
			slidesPos = (slidesPos * 0.4) + (
				(- this.slideSize - this.options.gapSize) *
				(this.slides.length - 1)
			) * 0.6;
		}

		this.modify(this.elements.slides, {
			offset: slidesPos
		});

		if (posDiff < 0 || posDiff > 0) {
			this.dragLastDiff = posDiff;
		}
		this.dragLastPos = pos[this.options.direction];

	};

	/**
	 * returns the position of the cursor
	 */
	Slider.prototype.getPositionFromEvent = function(event) {

		var pos = {
			x: event.pageX,
			y: event.pageY
		};

		if (typeof pos.x !== 'number') {
			pos = {
				x: event.originalEvent.pageX,
				y: event.originalEvent.pageY
			};
		}

		if (event.originalEvent.touches && event.originalEvent.touches[0]) {
			pos = {
				x: event.originalEvent.touches[0].pageX,
				y: event.originalEvent.touches[0].pageY
			};
		}

		return pos;

	};

	return Slider;
})();
