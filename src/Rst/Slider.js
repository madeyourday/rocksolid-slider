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

		this.slides = [];
		this.elements = {};

		this.elements.main = element;
		this.options = $.extend({}, this.defaultOptions, options);

		if (this.options.height === 'auto' && this.options.direction === 'y') {
			throw new Error('height "auto" with direction "y" ist not possible');
		}

		if (this.options.type !== 'slide') {
			this.options.visibleArea = 1;
			this.options.slideMaxCount = 0;
			this.options.slideMinWidth = 0;
		}

		this.checkCss3Support();

		this.readSlides();
		if (this.options.random) {
			this.slides.sort(function() {
				return Math.random() - 0.5;
			});
		}

		this.slideIndex = this.getIndexFromUrl();
		if (this.slideIndex === false) {
			this.slideIndex = 0;
		}
		this.activeSlideOffset = 0;
		$(window).on('hashchange.rsts', function(){
			var index = self.getIndexFromUrl();
			if (index !== false && index !== self.slideIndex) {
				self.goTo(index);
			}
		});

		this.elements.main
			.addClass(this.options.cssPrefix + 'main')
			.addClass(this.options.cssPrefix + 'direction-' + this.options.direction)
			.addClass(this.options.cssPrefix + 'type-' + this.options.type)
			.addClass(this.options.cssPrefix + 'skin-' + this.options.skin);

		if (this.options.direction === 'x' && (
			this.options.height === 'auto' ||
			(this.options.height === 'css' && this.elements.main.height() < 1)
		)) {
			this.autoSize = true;
		}
		else if (this.options.direction === 'y' && (
			this.options.width === 'auto' ||
			(this.options.width === 'css' && this.elements.main.width() < 1)
		)) {
			this.autoSize = true;
		}

		var proportion = this.options.width.match(/([0-9.]+)[^0-9.]*x[^0-9.]*([0-9.]+)/i);
		if (proportion) {
			this.proportion = proportion[1] / proportion[2];
			delete this.options.width;
		}
		proportion = this.options.height.match(/([0-9.]+)[^0-9.]*x[^0-9.]*([0-9.]+)/i);
		if (proportion) {
			this.proportion = proportion[1] / proportion[2];
			delete this.options.height;
		}

		if (this.options.width && this.options.width !== 'css') {
			this.elements.main.css({width: this.options.width});
			// auto sizing of width is currently not supported
			if (this.options.width === 'auto') {
				this.options.width = 'css';
			}
		}
		if (this.options.height && this.options.height !== 'css') {
			this.elements.main.css({height: this.options.height});
		}

		if (this.elements.header) {
			this.elements.header
				.addClass(this.options.cssPrefix + 'header')
				.appendTo(this.elements.main);
		}

		this.elements.view = $(document.createElement('div'))
			.addClass(this.options.cssPrefix + 'view')
			.appendTo(this.elements.main);

		this.elements.crop = $(document.createElement('div'))
			.addClass(this.options.cssPrefix + 'crop')
			.on('scroll', function() {
				$(this).scrollLeft(0).scrollTop(0);
			})
			.appendTo(this.elements.view);

		this.elements.slides = $(document.createElement('div'))
			.addClass(this.options.cssPrefix + 'slides')
			.appendTo(this.elements.crop);

		if (this.options.autoplay && this.options.autoplayProgress) {
			this.elements.progress = $(document.createElement('div'))
				.addClass(this.options.cssPrefix + 'progress')
				.appendTo(this.elements.view);
			this.elements.progressBar = $(document.createElement('div'))
				.appendTo(this.elements.progress);
		}

		if (this.options.visibleArea < 1) {
			this.elements.overlayPrev = $(document.createElement('div'))
				.addClass(this.options.cssPrefix + 'overlay-prev')
				.appendTo(this.elements.view);
			this.elements.overlayNext = $(document.createElement('div'))
				.addClass(this.options.cssPrefix + 'overlay-next')
				.appendTo(this.elements.view);
		}

		this.nav = new Rst.SliderNav(this);

		if (this.elements.footer) {
			this.elements.footer
				.addClass(this.options.cssPrefix + 'footer')
				.appendTo(this.elements.main);
		}

		this.preloadSlides(this.slideIndex);
		// Sets active states
		this.cleanupSlides();
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
				function(event) {
					if ((
						self.options.type === 'slide' &&
						event.target === self.elements.slides.get(0)
					) || (
						self.options.type === 'fade' &&
						event.target.parentNode === self.elements.slides.get(0)
					)) {
						self.cleanupSlides();
					}
				}
			);
			this.elements.crop.css({
				transform: 'translateZ(0)'
			});
		}

		this.autoplay();

		if (this.options.pauseAutoplayOnHover) {
			this.elements.view.on('mouseenter', function() {
				if (!self.isTouch) {
					self.pauseAutoplay();
				}
			});
			this.elements.view.on('mouseleave', function() {
				self.playAutoplay();
			});
		}

		if (this.options.keyboard) {
			$(document.body).on('keydown.rsts', function(event){
				var codePrev = self.options.direction === 'x' ? 37 : 38;
				var codeNext = self.options.direction === 'x' ? 39 : 40;
				if ((event.which === codePrev || event.which === codeNext) && (
					event.target === document.body ||
					$(event.target).closest(self.elements.main).length
				)) {
					self.goTo(self.slideIndex + (event.which === codePrev ? -1 : 1));
				}
			});
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
		// the size of the area for the visible slide (0 = 0%, 1 = 100%)
		visibleArea: 1,
		// if true the slides get shuffled once on initialization
		random: false,
		// if true the slider loops infinitely
		loop: false,
		// prefix for all RockSolid Slider specific css class names
		cssPrefix: 'rsts-',
		// slider skin (set this to "none" to disable the default skin)
		skin: 'default',
		// set width and height to one of the following values
		// - "css": get the size from the applied css (default)
		// - a css lenght value: e.g. "100%", "500px", "50em"
		// - "auto": get the size from the active slide dimensions at runtime
		//   height can be set to auto only if the direction is "x"
		// - a proportion: keep a fixed proportion for the slides, e.g. "480x270"
		//   this must not set to both dimensions
		width: 'css',
		height: 'css',
		// number of slides to preload (to the left/right or top/bottom)
		preloadSlides: 2,
		// maximum number of visible slides
		slideMaxCount: 0,
		// minimal with of one slide
		slideMinWidth: 0,
		// true, "x" or "y" to center the the slides content
		// use the attribute data-rsts-center to set the mode per slide
		centerContent: false,
		// gap between the slides in pixels or as string in percent
		gapSize: 20,
		// duration of the slide animation in milliseconds
		duration: 400,
		// false or the duration between slides in milliseconds
		autoplay: false,
		// true to autoplay videos
		videoAutoplay: false,
		// false or the duration between user interaction and autoplay
		// (must be bigger than autoplay)
		autoplayRestart: false,
		// displays a progress bar
		autoplayProgress: false,
		// true to pause the autoplay on hover
		pauseAutoplayOnHover: false,
		// navigation type (bullets, numbers, tabs, none)
		navType: 'bullets',
		// false to hide the prev and next controls
		controls: true,
		// image scale mode (fit, crop, scale or none)
		// use the attribute data-rsts-scale-mode to set the mode per slide
		// only works if width and height are not set to "auto"
		scaleMode: 'fit',
		// URL hash prefix or false to disable deep linking, e.g. "slider-"
		deepLinkPrefix: false,
		// true to enable keyboard arrow navigation
		keyboard: true,
		// true to enable caption elements inside slides
		captions: true
	};

	/**
	 * slides to a specific slide
	 * @param number index slide index
	 */
	Slider.prototype.goTo = function(index, fromDrag, fromAutoplay) {

		var self = this;

		if (! fromAutoplay) {
			this.stopAutoplay();
		}

		var visibleCount = this.getVisibleSlidesCount();

		var overflow = false;
		var loop = 0;
		var oldIndex = this.slideIndex;

		if (
			(index < 0 || index > this.slides.length - 1)
			&& this.options.loop
		) {
			loop = index - this.slideIndex;
			while (index < 0) {
				index += this.slides.length;
			}
			while (index > this.slides.length - 1) {
				index -= this.slides.length;
			}
		}
		else if (
			(index < 0 || index > this.slides.length - visibleCount)
			&& !this.options.loop
		) {
			if (this.options.type === 'fade') {
				return;
			}
			overflow = index < 0 ? -1 : 1;
			index = index < 0 ? 0 : this.slides.length - visibleCount;
		}

		if (! overflow && this.slideIndex === index && ! fromDrag) {
			return;
		}

		var activeSlidesBefore = [];
		for (var i = this.slideIndex; i <= this.slideIndex + visibleCount - 1; i++) {
			activeSlidesBefore.push(i >= this.slides.length
				? i - this.slides.length
				: i
			);
		}

		var activeSlides = [];
		for (i = index; i <= index + visibleCount - 1; i++) {
			activeSlides.push(i >= this.slides.length
				? i - this.slides.length
				: i
			);
		}

		$.each(activeSlidesBefore, function(i, slideIndex) {
			if ($.inArray(slideIndex, activeSlides) === -1) {
				self.slides[slideIndex].setState('postactive');
			}
		});
		$.each(activeSlides, function(i, slideIndex) {
			if ($.inArray(slideIndex, activeSlidesBefore) === -1) {
				self.slides[slideIndex].setState('preactive');
			}
		});

		var slideWidth = this.slideSize + this.getGapSize();

		if (loop) {
			this.activeSlideOffset += slideWidth * loop;
		}
		else {
			if (
				index > this.slideIndex
				&& index - this.slideIndex - visibleCount > this.options.preloadSlides * 2
			) {
				this.activeSlideOffset += (this.options.preloadSlides * 2 + visibleCount)
					* slideWidth;
			}
			else if (
				index < this.slideIndex
				&& this.slideIndex - index - visibleCount > this.options.preloadSlides * 2
			) {
				this.activeSlideOffset -= (this.options.preloadSlides * 2 + visibleCount)
					* slideWidth;
			}
			else {
				this.activeSlideOffset += (index - this.slideIndex) * slideWidth;
			}
		}

		this.slideIndex = index;

		var preloadOnCleanup = true;
		if (!fromDrag) {
			preloadOnCleanup = false;
		}
		else {
			$.each(activeSlides, function(i, slideIndex) {
				if (
					!self.slides[slideIndex].isInjected()
					|| Math.round(self.slides[slideIndex].element.position()[
						{x: 'left', y: 'top'}[self.options.direction]
					]) !== Math.round(self.getSlideOffset(self.slideIndex + i))
				) {
					preloadOnCleanup = false;
					return false;
				}
			});
		}
		if (preloadOnCleanup) {
			// performance optimization
			this.preloadOnCleanup = true;
		}
		else {
			this.preloadSlides(index, oldIndex);
		}

		var size = this.getViewSize(index);
		var durationScale;
		var targetPos = - this.getSlideOffset(index)
			+ Math.round(
				size[this.options.direction]
				* (1 - this.options.visibleArea) / 2
			);

		if (fromDrag && !overflow) {
			durationScale = Math.abs((
				this.getOffset(this.elements.slides) - targetPos
			) / slideWidth);
		}
		else if (fromDrag && overflow) {
			durationScale = 0.7;
		}

		if (this.options.type === 'slide') {
			this.modify(this.elements.slides, {
				offset: targetPos
			}, true, durationScale, fromDrag, !fromDrag && overflow);
		}
		else if (this.options.type === 'fade') {
			this.modify(this.slides[this.slideIndex].element, {opacity: 1}, true);
		}

		if (this.autoSize) {
			this.modify(this.elements.crop, {
				width: size.x,
				height: size.y
			}, true, durationScale, fromDrag);
		}

	};

	/**
	 * returns deep link index from URL hash
	 */
	Slider.prototype.getIndexFromUrl = function() {

		if (! this.options.deepLinkPrefix) {
			return false;
		}

		var hashPrefix = '#' + this.options.deepLinkPrefix;
		if (window.location.hash.substr(0, hashPrefix.length) === hashPrefix) {
			var hashIndex = Math.abs(
				parseInt(window.location.hash.substr(hashPrefix.length), 10)
			);
			if (hashIndex) {
				if (hashIndex > this.slides.length) {
					hashIndex = this.slides.length;
				}
				return hashIndex - 1;
			}
		}

		return 0;

	};

	/**
	 * stops/restarts autoplay
	 */
	Slider.prototype.stopAutoplay = function(noRestart) {

		var self = this;

		clearTimeout(this.autoplayTimeout);
		clearInterval(this.autoplayInterval);

		this.autoplayStopped = true;

		if (this.options.autoplay && this.options.autoplayProgress) {
			this.elements.progress.removeClass(this.options.cssPrefix + 'progress-active');
		}

		if (this.options.autoplayRestart && !noRestart) {
			this.autoplayTimeout = setTimeout(function() {
				self.autoplay();
			}, this.options.autoplayRestart - this.options.autoplay);
		}

	};

	/**
	 * pause autoplay and autoplay progress bar
	 */
	Slider.prototype.pauseAutoplay = function() {

		if (! this.options.autoplay || this.autoplayPaused) {
			return;
		}

		if (! this.autoplayStopped) {
			clearTimeout(this.autoplayTimeout);
			clearInterval(this.autoplayInterval);
		}

		this.autoplayPaused = true;

		if (
			this.options.autoplay &&
			this.options.autoplayProgress &&
			! this.autoplayStopped
		) {
			this.pauseAutoplayProgressBar();
		}

	};

	/**
	 * play paused autoplay
	 */
	Slider.prototype.playAutoplay = function() {

		if (! this.options.autoplay || ! this.autoplayPaused) {
			return;
		}

		this.autoplayPaused = false;
		if (! this.autoplayStopped) {
			this.autoplay((
				1 - (this.options.autoplayProgress ?
					this.elements.progressBar.outerWidth() /
					this.elements.progress.width()
				: 0)
			) * this.options.autoplay);
		}

	};

	/**
	 * starts autoplay
	 */
	Slider.prototype.autoplay = function(duration) {

		var self = this;

		if (!this.options.autoplay) {
			return;
		}

		clearTimeout(this.autoplayTimeout);
		clearInterval(this.autoplayInterval);

		this.autoplayStopped = false;

		if (this.autoplayPaused) {
			this.pauseAutoplayProgressBar(0);
			return;
		}

		duration = (duration || duration === 0) ? duration :
			(this.options.autoplay - this.options.duration);

		this.startAutoplayProgressBar(duration);

		var intervalFunction = function() {
			var index = self.slideIndex + 1;
			if (index > self.slides.length - 1 && !self.options.loop) {
				index = 0;
			}
			self.goTo(index, false, true);
			self.startAutoplayProgressBar();
		};

		this.autoplayTimeout = setTimeout(function() {
			intervalFunction();
			self.autoplayInterval = setInterval(intervalFunction, self.options.autoplay);
		}, duration);

	};

	Slider.prototype.startAutoplayProgressBar = function(duration) {

		if (! this.options.autoplayProgress) {
			return;
		}

		duration = duration || this.options.autoplay;

		this.elements.progress.addClass(this.options.cssPrefix + 'progress-active');
		this.modify(this.elements.progressBar, {
			width: (1 - (duration / this.options.autoplay)) * 100 + '%'
		});

		// get the css value to ensure the engine applies the width
		this.elements.progressBar.css('width');

		this.modify(
			this.elements.progressBar,
			{width: '100%'},
			true,
			null,
			null,
			null,
			duration,
			'linear'
		);

	};

	Slider.prototype.pauseAutoplayProgressBar = function(position) {

		if (! this.options.autoplayProgress) {
			return;
		}

		if (!position && position !== 0) {
			position = this.elements.progressBar.outerWidth() / this.elements.progress.width();
		}

		this.elements.progress.addClass(this.options.cssPrefix + 'progress-active');
		this.modify(this.elements.progressBar, {width: position * 100 + '%'});

	};

	/**
	 * check support for transition and transform/translate3d
	 * (to use hardware acceleration if possible)
	 */
	Slider.prototype.checkCss3Support = function() {

		var self = this;

		this.css3Supported = false;

		// currently only detecting mozilla is needed
		this.engine = 'mozInnerScreenX' in window ? 'moz' : 'unknown';
		this.device = navigator.platform;
		if (this.device && this.device.indexOf('iPad') === 0) {
			this.device = 'iPad';
		}
		if (this.device && this.device.indexOf('iPhone') === 0) {
			this.device = 'iPhone';
		}
		if (this.device && this.device.indexOf('iPod') === 0) {
			this.device = 'iPod';
		}

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
	Slider.prototype.modify = function(element, css, animate, durationScale, fromDrag, bounce, duration, timingFunction) {

		var self = this;
		var origOffset;

		if (typeof durationScale !== 'number') {
			durationScale = 1;
		}

		if (typeof css.offset === 'number') {

			if (animate && bounce) {
				origOffset = css.offset;
				css.offset += this.getViewSizeFixed(true)[this.options.direction]
					* 0.075 * - bounce;
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
				css[{x: 'left', y: 'top'}[this.options.direction]] = '';
			}
			else {
				css[{x: 'left', y: 'top'}[this.options.direction]] = css.offset;
				css.transform = '';
			}

			delete css.offset;

		}

		// stop animations
		element.stop();

		if (animate && this.css3Supported) {
			css['transition-timing-function'] = timingFunction ?
				timingFunction : fromDrag ?
				'cubic-bezier(0.390, 0.575, 0.565, 1.000)' :
				'cubic-bezier(0.445, 0.050, 0.550, 0.950)';
			css['transition-duration'] = duration ? duration + 'ms' :
				this.options.duration * durationScale + 'ms';
			element.css(css);
		}
		else if (animate) {
			element.animate(css, {
				duration: duration ? duration :
					this.options.duration * durationScale,
				easing: timingFunction ? timingFunction :
					fromDrag ? 'easeOutSine' : 'easeInOutSine',
				complete: (
					this.options.type === 'slide' ? element : element.parent()
				)[0] === this.elements.slides[0] ? function() {
					self.cleanupSlides();
				} : null
			});
		}
		else {
			css['transition-duration'] = '';
			element.css(css);
		}

		if (animate) {
			if ((
				this.options.type === 'slide' ? element : element.parent()
			)[0] === this.elements.slides[0]) {
				clearTimeout(this.cleanupSlidesTimeout);
				this.cleanupSlidesTimeout = setTimeout(function() {
					self.cleanupSlides();
				}, parseFloat(css['transition-duration']) + 100);
			}
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
			var $this = $(this);
			if ($this.is('h1, h2, h3, h4, h5, h6, [data-rsts-type="header"]')) {
				if (!self.elements.header) {
					self.elements.header = $(document.createElement('div'));
				}
				$this.appendTo(self.elements.header);
			}
			else if ($this.is('[data-rsts-type="footer"]')) {
				if (!self.elements.footer) {
					self.elements.footer = $(document.createElement('div'));
				}
				$this.appendTo(self.elements.footer);
			}
			else {
				self.slides.push(new Rst.Slide(this, self));
			}
		});

		this.elements.main.empty();

		if (this.slides.length === 0) {
			throw new Error('No slides found');
		}

	};

	/**
	 * injects Slide objects to the DOM
	 */
	Slider.prototype.preloadSlides = function(slideIndex, oldIndex) {

		var self = this;

		var size = this.getViewSizeFixed();
		size[this.options.direction] = this.slideSize;

		var visibleCount = this.getVisibleSlidesCount();
		var preloadCount = 0;
		if (this.options.type === 'slide') {
			preloadCount = Math.min(
				Math.floor((this.slides.length - visibleCount) / 2),
				this.options.preloadSlides
			);
		}

		var activeSlides = [];
		for (var i = slideIndex; i <= slideIndex + visibleCount - 1; i++) {
			activeSlides.push(i >= this.slides.length
				? i - this.slides.length
				: i
			);
		}

		var slide, key;
		for (i = slideIndex - preloadCount; i <= slideIndex + preloadCount + visibleCount - 1; i++) {

			key = i < 0
				? i + this.slides.length
				: i >= this.slides.length
				? i - this.slides.length
				: i;

			slide = this.slides[key];

			if (self.options.type === 'slide') {
				if (!this.options.loop && (i < 0 || i >= this.slides.length)) {
					continue;
				}
				if (
					oldIndex !== undefined
					&& $.inArray(key, activeSlides) === -1
					&& (i < 0 || i >= this.slides.length)
					&& slide.isInjected()
				) {
					this.preloadOnCleanup = true;
					continue;
				}
				self.modify(slide.element, {
					offset: self.getSlideOffset(i)
				});
			}

			// Check if the slide isn't already injected
			if (!slide.isInjected()) {
				if (self.options.type === 'fade') {
					self.modify(slide.element, {opacity: 0});
				}
				self.elements.slides.append(slide.element);
				slide.size(size.x, size.y);
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
				// Move slide to the last position
				self.elements.slides.append(slide.element);
			}

		}

	};

	/**
	 * removes Slide objects from the DOM
	 */
	Slider.prototype.cleanupSlides = function() {

		clearTimeout(this.cleanupSlidesTimeout);

		var self = this;
		var visibleCount = this.getVisibleSlidesCount();
		var preloadCount = this.options.type === 'slide' ?
			this.options.preloadSlides :
			0;
		var keepSlides = [];
		var activeSlides = [];

		for (var i = this.slideIndex - preloadCount; i <= this.slideIndex + preloadCount + visibleCount - 1; i++) {
			keepSlides.push(i < 0
				? i + this.slides.length
				: i >= this.slides.length
				? i - this.slides.length
				: i
			);
		}
		for (i = this.slideIndex; i <= this.slideIndex + visibleCount - 1; i++) {
			activeSlides.push(i >= this.slides.length
				? i - this.slides.length
				: i
			);
		}

		$.each(this.slides, function(i, slide) {
			if (slide.isInjected() && $.inArray(i, keepSlides) === -1) {
				if (
					self.options.type === 'fade' &&
					self.slides[self.slideIndex].element.css('opacity') < 1
				) {
					return;
				}
				slide.element.detach();
			}
			if ($.inArray(i, activeSlides) === -1 && slide.state !== 'inactive') {
				slide.setState('inactive');
			}
		});

		this.nav.setActive(activeSlides);
		$.each(activeSlides, function(i, slideIndex) {
			self.slides[slideIndex].setState('active');
		});

		if (this.options.deepLinkPrefix && this.getIndexFromUrl() !== this.slideIndex) {
			if (this.slideIndex) {
				window.location.hash = '#' + this.options.deepLinkPrefix + (this.slideIndex + 1);
			}
			else {
				if (window.history && window.history.pushState) {
					window.history.pushState(
						'',
						document.title,
						window.location.pathname + window.location.search
					);
				}
				else {
					var scroll = {
						x: $(window).scrollLeft(),
						y: $(window).scrollTop()
					};
					window.location.hash = '';
					$(window).scrollLeft(scroll.x);
					$(window).scrollTop(scroll.y);
				}
			}
		}

		if (this.preloadOnCleanup) {
			this.preloadOnCleanup = false;
			this.preloadSlides(this.slideIndex);
		}

	};

	/**
	 * Returns the calculated offset for the specified slide
	 *
	 * @param  int index slide index
	 * @return number    calculated offset
	 */
	Slider.prototype.getSlideOffset = function(index) {
		var size = this.getViewSizeFixed(true);

		return (index - this.slideIndex)
			* (this.slideSize + this.getGapSize())
			+ this.activeSlideOffset;
	};

	/**
	 * Returns the calculated number of visible slides
	 *
	 * @return number calculated number of visible slides
	 */
	Slider.prototype.getVisibleSlidesCount = function() {

		if (!this.options.slideMaxCount && !this.options.slideMinWidth) {
			return 1;
		}

		var size = Math.round(
			this.getViewSizeFixed(true)[this.options.direction]
			* this.options.visibleArea
		);
		var gapSize = this.getGapSize();
		var count = this.options.slideMaxCount;

		if (!count || (size - (gapSize * (count - 1))) / count < this.options.slideMinWidth) {
			count = Math.floor((size + gapSize) / (this.options.slideMinWidth + gapSize));
		}

		return Math.min(this.slides.length, Math.max(1, count));

	};

	/**
	 * returns an object containing view width and height fixed values
	 * @return object {x: ..., y: ...}
	 */
	Slider.prototype.getViewSizeFixed = function(useCache) {

		if (useCache && this.viewSizeFixedCache) {
			// Return a copy of the object
			return $.extend({}, this.viewSizeFixedCache);
		}

		var x, y;

		if (!this.autoSize || this.options.direction === 'x') {
			x = this.elements.main.width();
			x -= this.elements.view.outerWidth(true) - this.elements.view.width();
			if (x < 10) {
				x = 10;
			}
			x = Math.round(x);
		}
		if (!this.autoSize || this.options.direction === 'y') {
			y = this.elements.main.height();
			y -= this.elements.view.outerHeight(true) - this.elements.view.height();
			y -= this.nav.getSize().y;
			if (
				this.elements.header &&
				this.elements.header.css('position') !== 'absolute'
			) {
				y -= this.elements.header.outerHeight(true);
			}
			if (
				this.elements.footer &&
				this.elements.footer.css('position') !== 'absolute'
			) {
				y -= this.elements.footer.outerHeight(true);
			}
			if (y < 10) {
				y = 10;
			}
			y = Math.round(y);
		}

		if (! this.options.width && this.proportion) {
			x = Math.round(y * this.proportion);
		}
		if (! this.options.height && this.proportion) {
			y = Math.round(x / this.proportion);
		}

		this.viewSizeFixedCache = {x: x, y: y};

		var gapSize = this.getGapSize();
		var visibleCount = this.getVisibleSlidesCount();
		this.slideSize = Math.round(
			(
				((this.options.direction === 'x' ? x : y) * this.options.visibleArea)
				- (gapSize * (visibleCount - 1))
			) / visibleCount
		);

		// Return a copy of the object
		return $.extend({}, this.viewSizeFixedCache);

	};

	/**
	 * returns an object containing view width and height
	 * @return object {x: ..., y: ...}
	 */
	Slider.prototype.getViewSize = function(slideIndex) {

		slideIndex = slideIndex || 0;

		var size = this.getViewSizeFixed();
		var backupSize = size[this.options.direction];
		size[this.options.direction] = this.slideSize;

		// calculate the missing dimension
		if (!size.x || !size.y) {

			var visibleCount = this.getVisibleSlidesCount();
			var missingDimension = !size.x ? 'x' : 'y';
			var key, slideSize, newSize;
			for (var i = slideIndex; i <= slideIndex + visibleCount - 1; i++) {
				key = i >= this.slides.length
					? i - this.slides.length
					: i;
				slideSize = this.slides[key].size(size.x, size.y, true);
				newSize = Math.max(newSize || 0, slideSize[missingDimension]);
			}

			size[missingDimension] = Math.max(10, newSize || 0);

		}

		size[this.options.direction] = backupSize;

		return size;

	};

	/**
	 * @return number gap size in pixels
	 */
	Slider.prototype.getGapSize = function() {

		var size = this.options.gapSize;
		if (typeof size === 'string' && size.slice(-1) === '%') {
			size = size.split('%')[0].split(',').join('.')
				* this.getViewSizeFixed(true)[this.options.direction] / 100;
		}

		return Math.round(parseFloat(size)) || 0;

	};

	/**
	 * recalculates the size of the slider
	 */
	Slider.prototype.resize = function() {

		var self = this;
		var visibleCountBefore = this.getVisibleSlidesCount();
		var width, height;

		// Check if the CSS height value has changed to "auto" or vice versa
		if (this.options.direction === 'x' && this.options.height === 'css') {
			// Pause autoplay to freeze the progress bar
			this.pauseAutoplay();
			this.elements.view.css({display: 'none'});
			if (this.nav.elements.main) {
				this.nav.elements.main.css({display: 'none'});
			}
			if (this.elements.header) {
				this.elements.header.css({display: 'none'});
			}
			if (this.elements.footer) {
				this.elements.footer.css({display: 'none'});
			}
			this.autoSize = this.elements.main.height() < 1;
			this.elements.view.css({display: ''});
			if (this.nav.elements.main) {
				this.nav.elements.main.css({display: ''});
			}
			if (this.elements.header) {
				this.elements.header.css({display: ''});
			}
			if (this.elements.footer) {
				this.elements.footer.css({display: ''});
			}
			this.playAutoplay();
		}

		var size = this.getViewSize(this.slideIndex);
		this.modify(this.elements.crop, {
			width: size.x,
			height: size.y
		});

		if (this.elements.overlayPrev && this.elements.overlayNext) {
			if (this.options.direction === 'x') {
				this.modify(this.elements.overlayPrev, {
					width: Math.round(size.x * (1 - this.options.visibleArea) / 2)
				});
				this.modify(this.elements.overlayNext, {
					width: Math.round(size.x * (1 - this.options.visibleArea) / 2)
				});
			}
			else {
				this.modify(this.elements.overlayPrev, {
					height: Math.round(size.y * (1 - this.options.visibleArea) / 2)
				});
				this.modify(this.elements.overlayNext, {
					height: Math.round(size.y * (1 - this.options.visibleArea) / 2)
				});
			}
		}

		var backupSize = size[this.options.direction];
		size[this.options.direction] = this.slideSize;

		if (!this.autoSize || this.options.direction === 'x') {
			width = size.x;
		}
		if (!this.autoSize || this.options.direction === 'y') {
			height = size.y;
		}

		$.each(this.slides, function(i, slide) {
			if (slide.isInjected()) {
				slide.size(width, height);
				if (self.options.type === 'slide') {
					self.modify(slide.element, {
						offset: self.getSlideOffset(i)
					});
				}
			}
		});

		this.preloadSlides(this.slideIndex);

		if (this.options.type === 'slide') {
			this.modify(this.elements.slides, {
				offset: -self.getSlideOffset(this.slideIndex)
					+ Math.round(
						backupSize
						* (1 - this.options.visibleArea)
						/ 2
					)
			});
		}

		if (visibleCountBefore !== this.getVisibleSlidesCount()) {
			// Sets active states
			this.cleanupSlides();
		}

	};

	/**
	 * @return Rst.Slide[] all slides
	 */
	Slider.prototype.getSlides = function() {
		return this.slides;
	};

	/**
	 * set isTouch and add or remove the classes rsts-touch and rsts-no-touch
	 */
	Slider.prototype.setTouch = function(isTouch) {

		if (isTouch !== this.isTouch) {
			if (isTouch) {
				this.elements.main
					.addClass(this.options.cssPrefix + 'touch')
					.removeClass(this.options.cssPrefix + 'no-touch');
			}
			else {
				this.elements.main
					.addClass(this.options.cssPrefix + 'no-touch')
					.removeClass(this.options.cssPrefix + 'touch');
			}
		}

		if (isTouch) {
			this.lastTouchTime = new Date().getTime();
		}

		this.isTouch = isTouch;

	};

	/**
	 * detects mouse or touch events and adds the event handlers
	 */
	Slider.prototype.setDragEvents = function() {

		var self = this;

		this.lastTouchTime = 0;
		this.setTouch(false);

		var eventNames = {
			start: 'mousedown',
			stop: 'mouseup',
			move: 'mousemove'
		};

		if (window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints) {
			eventNames = {
				start: 'MSPointerDown',
				stop: 'MSPointerUp',
				move: 'MSPointerMove'
			};
			this.elements.crop.css('-ms-touch-action', 'pan-' + (this.options.direction === 'x' ? 'y' : 'x') + ' pinch-zoom double-tap-zoom');
			this.elements.main.on('MSPointerDown', function(event) {
				if (event.originalEvent.pointerType === event.originalEvent.MSPOINTER_TYPE_TOUCH) {
					self.setTouch(true);
				}
			});
		}
		else if ('ontouchstart' in window || 'ontouchend' in document) {
			// set mouse and touch events for devices supporting both types
			eventNames = {
				start: eventNames.start + ' touchstart',
				stop: eventNames.stop + ' touchend touchcancel',
				move: eventNames.move + ' touchmove'
			};
			this.elements.main.on('touchstart', function(event) {
				self.setTouch(true);
			});
		}

		this.elements.crop.on(eventNames.start, function(event) {
			return self.onDragStart(event);
		});
		$(document).on(eventNames.stop + '.rsts', function(event) {
			return self.onDragStop(event);
		});
		$(document).on(eventNames.move + '.rsts', function(event) {
			return self.onDragMove(event);
		});

	};

	/**
	 * on drag start event
	 */
	Slider.prototype.onDragStart = function(event) {

		if (
			this.isDragging ||
			(event.type === 'mousedown' && event.which !== 1) ||
			$(event.target).closest(
				'.no-drag,a,button,input,select,textarea',
				this.elements.slides
			).length
		) {
			return;
		}

		// detect mouse or touch event
		if (window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints) {
			this.setTouch(event.originalEvent.pointerType === event.originalEvent.MSPOINTER_TYPE_TOUCH);
		}
		else {
			this.setTouch(
				event.type !== 'mousedown' ||
				new Date().getTime() - this.lastTouchTime < 1000
			);
		}

		var pos = this.getPositionFromEvent(event);

		if (! this.isTouch) {
			event.preventDefault();
			this.stopAutoplay();
		}

		this.elements.main.addClass(this.options.cssPrefix + 'dragging');

		this.isDragging = true;
		this.dragStartPos = {
			x: pos.x - this.elements.slides.offset().left + this.elements.crop.offset().left,
			y: pos.y - this.elements.slides.offset().top + this.elements.crop.offset().top
		};
		this.dragLastPos = pos[this.options.direction];
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

		var leftSlideIndex = this.slideIndex + Math.floor(
			(
				- this.getOffset(this.elements.slides)
				- this.activeSlideOffset
				+ (
					this.getViewSizeFixed(true)[this.options.direction]
					* (1 - this.options.visibleArea)
					/ 2
				)
			) /
			(this.slideSize + this.getGapSize())
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

		if (! this.isDragging || (
			this.isTouch && event.type === 'mousemove'
		)) {
			return;
		}

		var pos = this.getPositionFromEvent(event);
		var diffAxis;

		if (this.isTouch) {

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

		var visibleCount = this.getVisibleSlidesCount();
		if (!this.options.loop) {
			if (slidesPos > - this.getSlideOffset(0) + (
				this.getViewSizeFixed(true)[this.options.direction]
				* (1 - this.options.visibleArea) / 2
			)) {
				slidesPos = (slidesPos * 0.4) - (
					(this.getSlideOffset(0) - (
						this.getViewSizeFixed(true)[this.options.direction]
						* (1 - this.options.visibleArea) / 2
					)) * 0.6
				);
			}
			if (slidesPos < - this.getSlideOffset(this.slides.length - visibleCount) + (
				this.getViewSizeFixed(true)[this.options.direction]
				* (1 - this.options.visibleArea) / 2
			)) {
				slidesPos = (slidesPos * 0.4) - (
					(this.getSlideOffset(this.slides.length - visibleCount) - (
						this.getViewSizeFixed(true)[this.options.direction]
						* (1 - this.options.visibleArea) / 2
					)) * 0.6
				);
			}
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
