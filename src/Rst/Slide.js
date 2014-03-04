/*
 * Copyright MADE/YOUR/DAY OG <mail@madeyourday.net>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Rst.Slide Class
 */
Rst.Slide = (function() {

	/**
	 * Rst.Slide Constructor
	 * @param Element element slide element
	 */
	function Slide(element, slider) {

		var self = this;

		this.slider = slider;

		this.content = $(element);

		this.data = {
			name: this.content.attr('data-rsts-name') || this.content.attr('title')
		};

		if (element.nodeName === 'IMG') {
			this.type = 'image';
		}
		this.type = this.content.attr('data-rsts-type') || this.type || 'default';

		this.centerContent =
			this.content.attr('data-rsts-center') !== undefined
			? this.content.attr('data-rsts-center')
			: slider.options.centerContent;

		if (this.centerContent !== 'x' && this.centerContent !== 'y') {
			this.centerContent = !!this.centerContent;
		}

		if (this.type === 'image' || this.type === 'video') {
			this.centerContent = false;
		}

		this.element = $(document.createElement('div'))
			.addClass(slider.options.cssPrefix + 'slide')
			.addClass(slider.options.cssPrefix + 'slide-' + this.type)
			.append(element);

		if (
			// Check if video element is supported
			!document.createElement('video').canPlayType
			// iPhone doesn't support background videos
			|| this.slider.device === 'iPhone'
			|| this.slider.device === 'iPod'
		) {
			this.element.find('[data-rsts-background]').each(function() {
				if (this.nodeName !== 'VIDEO') {
					return;
				}
				var $this = $(this);
				if ($this.attr('poster')) {
					$(document.createElement('img'))
						.attr('src', $this.attr('poster'))
						.attr('data-rsts-background', '')
						.attr('data-rsts-scale-mode', $this.attr('data-rsts-scale-mode'))
						.insertBefore($this);
				}
				$this.detach();
			});
		}

		this.backgrounds = this.element.find('[data-rsts-background]')
			.attr('autoplay', true)
			.attr('loop', true)
			.css({
				position: 'absolute',
				top: 0,
				left: 0
			})
			.prependTo(this.element);

		if (this.backgrounds.length) {
			this.element.children().last().css({
				position: 'relative'
			});
		}

		this.element.find('video[autoplay]').each(function() {
			if (this.pause) {
				this.pause();
			}
		});

		if (this.type === 'image') {
			this.data.name = this.data.name || this.element.find('img').last().attr('alt');
		}

		if (this.data.name && slider.options.captions) {
			$(document.createElement('div'))
				.addClass(slider.options.cssPrefix + 'caption')
				.text(this.data.name)
				.appendTo(this.element);
		}

		var mediaLoadEvent = function() {

			slider.resize();

			// Fix safari bug with invisible images, see #9
			if (slider.css3Supported) {
				// Remove 3d transforms
				slider.elements.crop.css('transform', '');
				// Get the css value to ensure the engine applies the styles
				slider.elements.crop.css('transform');
				// Restore the original value
				slider.elements.crop.css('transform', 'translateZ(0)');
			}

		};

		this.element.find('img').on('load', mediaLoadEvent);
		this.element.find('video').on('loadedmetadata', mediaLoadEvent);

		var headlines = this.element.find('h1,h2,h3,h4,h5,h6');
		if (! this.data.name && headlines.length) {
			this.data.name = headlines.text();
		}

		if (this.type === 'video') {

			this.data.video = this.content.attr('data-rsts-video');
			$(document.createElement('a'))
				.attr('href', this.data.video)
				.text('play')
				.addClass(this.slider.options.cssPrefix + 'video-play')
				.on('click', function(event) {
					event.preventDefault();
					self.startVideo();
				})
				.appendTo(this.element);

		}

		this.setState('inactive');

	}

	/**
	 * @var object regular expressions for video URLs
	 */
	Slide.prototype.videoRegExp = {
		youtube: /^https?:\/\/(?:www\.youtube\.com\/(?:watch\?v=|v\/|embed\/)|youtu\.be\/)([0-9a-z_\-]{11})(?:$|&|\/)/i,
		vimeo: /^https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)/i
	};

	/**
	 * @return boolean true if the slide is injected to the DOM
	 */
	Slide.prototype.isInjected = function() {
		return !!(
			this.element.get(0).parentNode
			&& this.element.get(0).parentNode.tagName
		);
	};

	/**
	 * get width and height based on width or height
	 * @return object {x: ..., y: ...}
	 */
	Slide.prototype.size = function(x, y, ret) {

		var autoSize = !x || !y;

		if (x && ! y) {
			this.slider.modify(this.element, {width: x, height: ''});
			this.resetScaledContent();
			if (ret || this.backgrounds.length) {
				y = this.element.height();
			}
		}
		else if (y && ! x) {
			this.slider.modify(this.element, {height: y, width: ''});
			this.resetScaledContent();
			if (ret || this.backgrounds.length) {
				x = this.element.width();
			}
		}
		else if (x && y) {
			this.slider.modify(this.element, {width: x, height: y});
		}
		else {
			this.resetScaledContent();
			x = this.element.width();
			y = this.element.height();
		}

		this.scaleContent(x, y, autoSize);
		this.scaleBackground(x, y);

		return {
			x: x,
			y: y
		};

	};

	/**
	 * scale slide contents based on width and height
	 */
	Slide.prototype.scaleContent = function(x, y, autoSize) {

		if (this.centerContent) {
			if (this.content.css('display') === 'inline') {
				this.content.css('display', 'inline-block');
			}
			if (this.centerContent !== 'y' && x) {
				this.content.css(
					'margin-left',
					Math.round((x - this.content.width()) / 2)
				);
			}
			if (this.centerContent !== 'x' && y) {
				this.content.css(
					'margin-top',
					Math.round((y - this.content.height()) / 2)
				);
			}
		}

		if (!autoSize && (this.type === 'image' || this.type === 'video')) {
			this.scaleImage(this.element.find('img').last(), x, y);
		}

	};

	/**
	 * scale slide backgrounds based on width and height
	 */
	Slide.prototype.scaleBackground = function(x, y) {

		var self = this;

		this.backgrounds.each(function() {
			self.scaleImage($(this), x, y);
		});

	};


	/**
	 * scale an image element based on width, height and scaleMode
	 */
	Slide.prototype.scaleImage = function(image, x, y) {

		var scaleMode = image.attr('data-rsts-scale-mode')
			|| this.slider.options.scaleMode;
		var originalSize = this.getOriginalSize(image);
		var originalProp = originalSize.x / originalSize.y;
		var newProp = x / y;

		var css = {
			width: originalSize.x,
			height: originalSize.y,
			'margin-left': 0,
			'margin-top': 0
		};

		if (scaleMode === 'fit' || scaleMode === 'crop') {

			if (
				(originalProp >= newProp && scaleMode === 'fit') ||
				(originalProp <= newProp && scaleMode === 'crop')
			) {
				css.width = x;
				css.height = x / originalProp;
				css['margin-top'] = (y - css.height) / 2;
			}
			else {
				css.width = y * originalProp;
				css.height = y;
				css['margin-left'] = (x - css.width) / 2;
			}

		}
		else if (scaleMode === 'scale') {

			css.width = x;
			css.height = y;

		}
		else {

			css['margin-top'] = (y - originalSize.y) / 2;
			css['margin-left'] = (x - originalSize.x) / 2;

		}

		image.css(css);

	};

	Slide.prototype.getOriginalSize = function(element) {

		element = $(element);
		var size = {};

		if (element[0].nodeName === 'IMG') {

			if ('naturalWidth' in new Image()) {
				size.x = element[0].naturalWidth;
				size.y = element[0].naturalHeight;
			}
			else {
				var img = new Image();
				img.src = element[0].src;
				size.x = img.width;
				size.y = img.height;
			}

		}
		else if (element[0].nodeName === 'VIDEO') {

			size.x = element[0].videoWidth;
			size.y = element[0].videoHeight;

		}

		return {
			x: size.x || 10,
			y: size.y || 10
		};

	};

	/**
	 * reset scaled slide contents
	 */
	Slide.prototype.resetScaledContent = function(x, y) {

		var image = this.element.find('img').last();

		if (this.type === 'image' || this.type === 'video') {
			image.css({
				width: '',
				height: '',
				'margin-left': '',
				'margin-top': ''
			});
		}

		if (this.centerContent) {
			this.content.css({
				'margin-left': '',
				'margin-top': ''
			});
		}

	};

	/**
	 * @param string state "active", "preactive", or "inactive"
	 */
	Slide.prototype.setState = function(state) {

		if (
			this.type === 'video' &&
			this.state &&
			state === 'inactive' &&
			state !== this.state
		) {
			this.stopVideo();
		}
		if (
			this.type === 'video' &&
			this.state &&
			state === 'active' &&
			state !== this.state &&
			this.slider.options.videoAutoplay
		) {
			this.startVideo();
		}

		// Preactive is needed for iOS because it requires user interaction
		if (
			(state === 'preactive' || state === 'active')
			&& state !== this.state
		) {
			this.element.find('video[autoplay]').each(function() {
				if (this.play) {
					this.play();
				}
			});
		}
		else if (
			state !== 'active'
			&& state !== 'preactive'
			&& (this.state === 'active' || this.state === 'preactive')
		) {
			this.element.find('video').each(function() {
				if (this.pause) {
					this.pause();
				}
			});
		}

		this.state = state;

		var prefix = this.slider.options.cssPrefix;
		this.element
			.removeClass(prefix + 'active')
			.removeClass(prefix + 'inactive')
			.removeClass(prefix + 'preactive')
			.removeClass(prefix + 'postactive')
			.addClass(prefix + state);

	};

	/**
	 * stop video
	 */
	Slide.prototype.stopVideo = function(fromApi, fromButton) {

		if (this.eventNamespace) {
			$(window).off('message.' + this.eventNamespace);
			delete this.eventNamespace;
		}
		if (this.videoElement) {
			// IE bugfix
			this.videoElement.attr('src', '');
			this.videoElement.remove();
			delete this.videoElement;
		}
		if (this.videoStopButton) {
			this.videoStopButton.remove();
			delete this.videoStopButton;
		}

		this.slider.elements.main.removeClass(
			this.slider.options.cssPrefix + 'video-playing'
		);

		if (fromApi && this.slider.options.autoplayRestart) {
			this.slider.autoplay(200);
		}
		else if(fromButton) {
			// restart permanently stopped autoplay
			this.slider.stopAutoplay();
		}

	};

	/**
	 * start video
	 */
	Slide.prototype.startVideo = function() {

		var self = this;
		var videoId, apiCallback, matches;

		this.slider.stopAutoplay(true);

		if ((matches = this.data.video.match(this.videoRegExp.youtube))) {

			this.element.addClass(this.slider.options.cssPrefix + 'video-youtube');

			videoId = matches[1];
			this.videoElement = $(document.createElement('iframe'))
				.addClass(this.slider.options.cssPrefix + 'video-iframe')
				.attr('src',
					'http://www.youtube.com/embed/' +
					videoId +
					'?autoplay=1&enablejsapi=1&wmode=opaque'
				)
				.attr('frameborder', 0)
				.attr('allowfullscreen', 'allowfullscreen')
				.appendTo(this.element);

			apiCallback = function() {
				if (self.videoElement && window.YT) {
					new YT.Player(self.videoElement.get(0), {
						events: {
							onStateChange: function(event) {
								if (event.data === YT.PlayerState.ENDED) {
									self.stopVideo(true);
								}
							}
						}
					});
				}
			};

			if (window.YT && YT.Player) {
				apiCallback();
			}
			else {
				$(document.createElement('script'))
					.attr('src', '//www.youtube.com/iframe_api')
					.appendTo(document.head);
				window.onYouTubeIframeAPIReady = function() {
					delete window.onYouTubeIframeAPIReady;
					apiCallback();
				};
			}

		}
		else if ((matches = this.data.video.match(this.videoRegExp.vimeo))) {

			this.element.addClass(this.slider.options.cssPrefix + 'video-vimeo');

			videoId = matches[1];
			this.videoElement = $(document.createElement('iframe'))
				.addClass(this.slider.options.cssPrefix + 'video-iframe')
				.attr('src',
					'http://player.vimeo.com/video/' +
					videoId +
					'?autoplay=1&api=1'
				)
				.attr('frameborder', 0)
				.attr('allowfullscreen', 'allowfullscreen')
				.appendTo(this.element);

			this.eventNamespace = 'rsts' + new Date().getTime();
			$(window).on('message.' + this.eventNamespace, function(event) {
				var data = JSON.parse(event.originalEvent.data);
				if (data && data.event) {
					if (data.event === 'ready') {
						self.videoElement.get(0).contentWindow.postMessage(
							'{"method":"addEventListener","value":"finish"}',
							self.videoElement.attr('src').split('?')[0]
						);
					}
					else if (data.event === 'finish') {
						self.stopVideo(true);
					}
				}
			});

		}
		else {

			this.element.addClass(this.slider.options.cssPrefix + 'video-unknown');

			this.videoElement = $(document.createElement('iframe'))
				.addClass(this.slider.options.cssPrefix + 'video-iframe')
				.attr('src', this.data.video)
				.attr('frameborder', 0)
				.attr('allowfullscreen', 'allowfullscreen')
				.appendTo(this.element);

		}

		// iPad needs a close button outside of the video
		if (this.slider.device === 'iPad') {
			this.element.addClass(this.slider.options.cssPrefix + 'video-ipad');
		}

		this.videoStopButton = $(document.createElement('a'))
			.attr('href', this.data.video)
			.text('stop')
			.addClass(this.slider.options.cssPrefix + 'video-stop')
			.on('click', function(event) {
				event.preventDefault();
				self.stopVideo(false, true);
			})
			.appendTo(this.element);

		this.slider.elements.main.addClass(
			this.slider.options.cssPrefix + 'video-playing'
		);

	};

	/**
	 * @return object {}
	 */
	Slide.prototype.getData = function() {
		return this.data;
	};

	return Slide;
})();
