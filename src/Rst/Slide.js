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

		this.element = $(document.createElement('div'))
			.addClass(slider.options.cssPrefix + 'slide');

		this.data = {
			name: undefined,
			sliderClasses: []
		};
		this.backgrounds = $([]);

		if (element.nodeName.toLowerCase() === 'script' && element.type === 'text/html') {
			this.contentHtml = element.innerHTML.replace(/\\(.)/gi, '$1');
			this.data.name = $(element).attr('data-rsts-name') || undefined;
			this.data.thumbUrl = $(element).attr('data-rsts-thumb') || undefined;
			this.data.thumbHtml = $(element).attr('data-rsts-thumb-html') || undefined;
		}
		else {
			this.init(element);
		}

		this.setState('inactive');

	}

	/**
	 * init this slide
	 */
	Slide.prototype.init = function(element) {

		var self = this;

		if (this.isInitialized()) {
			return;
		}

		if (!element && this.contentHtml) {
			element = $(this.contentHtml)[0];
			delete this.contentHtml;
		}

		this.content = $(element);

		var sliderClasses = this.content.attr('data-rsts-class');

		this.data.name = this.content.attr('data-rsts-name') || this.content.attr('title');
		this.data.sliderClasses = (sliderClasses && sliderClasses.split(' ')) || [];
		if (this.content.attr('data-rsts-autoplay')) {
			this.data.autoplay = parseFloat(this.content.attr('data-rsts-autoplay'));
		}

		if (
			element.nodeName.toLowerCase() === 'img'
			|| element.nodeName.toLowerCase() === 'picture'
		) {
			this.type = 'image';
		}
		if (element.nodeName.toLowerCase() === 'video') {
			this.type = 'video';
		}
		this.type = this.content.attr('data-rsts-type') || this.type || 'default';

		this.centerContent =
			this.content.attr('data-rsts-center') !== undefined
			? this.content.attr('data-rsts-center')
			: this.slider.options.centerContent;

		if (this.centerContent !== 'x' && this.centerContent !== 'y') {
			this.centerContent = !!this.centerContent;
		}

		if (this.type === 'image' || this.type === 'video') {
			this.centerContent = false;
		}

		this.element
			.addClass(this.slider.options.cssPrefix + 'slide-' + this.type)
			.append(element);

		if (
			// Check if video element is supported
			!document.createElement('video').canPlayType
			// Old iPhones don’t support background videos
			|| (/^iPhone|^iPod/.test(navigator.platform) && !window.matchMedia('(-webkit-video-playable-inline)').matches)
		) {
			this.element.find('video[data-rsts-background]').each(function() {
				var $this = $(this);
				if ($this.attr('poster')) {
					$(document.createElement('img'))
						.attr('src', $this.attr('poster'))
						.attr('data-rsts-background', '')
						.attr('data-rsts-position', $this.attr('data-rsts-position'))
						.attr('data-rsts-scale-mode', $this.attr('data-rsts-scale-mode'))
						.insertBefore($this);
				}
				$this.detach();
			});
		}

		if (
			this.type === 'video'
			&& !this.content.attr('data-rsts-video')
			// Check if video element is supported
			&& !document.createElement('video').canPlayType
		) {
			this.element.find('video').each(function() {
				var $this = $(this);
				// No fallback image exists
				if (!$this.find('img').length) {
					$(document.createElement('img'))
						.attr('src', $this.attr('poster'))
						.attr('data-rsts-position', $this.attr('data-rsts-position'))
						.attr('data-rsts-scale-mode', $this.attr('data-rsts-scale-mode'))
						.appendTo($this);
				}
			});
			this.type = 'image';
		}

		this.backgrounds = [];
		this.element.find('[data-rsts-background]').each(function() {
			var element = $(this);
			if (element.is('img') && element.parent().is('picture')) {
				element = element.parent();
			}
			if (element.is('video')) {
				element.attr('autoplay', true).attr('loop', true).attr('playsinline', true).attr('webkit-playsinline', true);
			}
			element.css({
				position: 'absolute',
				top: 0,
				left: 0
			});
			self.backgrounds.push(element[0]);
		});

		this.backgrounds = $(this.backgrounds).prependTo(this.element);

		if (this.backgrounds.length) {
			this.element.children().last().css({
				position: 'relative'
			});
			if (this.backgrounds.filter('video').length) {
				// Fixes bug in Chrome 33 with disappearing elements over videos
				this.element.children().last().css({
					'-webkit-transform': 'translateZ(0)'
				});
			}
		}

		this.element.find('video[autoplay]').each(function() {
			if (this.pause) {
				this.pause();
			}
		});

		this.element.find('img[loading=lazy]').each(function() {
			this.loading = 'eager';
		});

		if (this.content.attr('data-rsts-thumb')) {
			this.data.thumbUrl = this.content.attr('data-rsts-thumb');
		}

		if (this.content.attr('data-rsts-thumb-html')) {
			this.data.thumbHtml = this.content.attr('data-rsts-thumb-html');
		}

		if (this.type === 'image') {
			this.data.name = this.data.name || this.element.find('img').last().attr('alt');
			if (this.element.find('img').last().attr('data-rsts-thumb')) {
				this.data.thumbUrl = this.element.find('img').last().attr('data-rsts-thumb');
			}
			if (!this.data.thumbUrl) {
				this.data.thumbUrl = this.element.find('img').last().attr('src');
			}
		}

		if (!this.data.thumbUrl && this.type === 'video') {
			if (
				!this.content.attr('data-rsts-video')
				&& this.element.find('video').last().attr('poster')
			) {
				this.data.thumbUrl = this.element.find('video').last().attr('poster');
			}
			else if (this.element.find('img').last().length) {
				this.data.thumbUrl =
					this.element.find('img').last().attr('data-rsts-thumb')
					|| this.element.find('img').last().attr('src');
			}
		}

		if (this.data.name && this.slider.options.captions) {
			$(document.createElement('div'))
				.addClass(this.slider.options.cssPrefix + 'caption')
				.text(this.data.name)
				.appendTo(this.element);
		}

		var mediaLoadEventFired = false;
		var loadedSources = {};
		var mediaLoadEvent = function(event) {

			mediaLoadEventFired = true;

			// Only handle load event once per source,
			// fixes bug in Chrome https://crbug.com/984121
			var src = event && event.target && (event.target.currentSrc || event.target.src);
			if (src) {
				var srcKey = ((event && event.type) || 'none') + '\n' + src;
				if ((loadedSources[srcKey] || 0) > Date.now() - 100) {
					return;
				}
				loadedSources[srcKey] = Date.now();
			}

			self.slider.resize(self.data.index);

			// Fix safari bug with invisible images, see #9
			if (self.slider.css3Supported) {
				// Apply 3d transform
				self.slider.elements.crop.css('transform', 'translateZ(0)');
				// Get the css value to ensure the engine applies the styles
				self.slider.elements.crop.css('transform');
				// Restore the original value
				self.slider.elements.crop.css('transform', '');
			}

		};

		this.element.find('img').on('load', mediaLoadEvent);
		this.element.find('video').on('loadedmetadata loadeddata', mediaLoadEvent);

		// Fix IE11 bug with missing load event, see #33
		if (this.element.find('img').length && !this.element.find('img')[0].complete) {
			setTimeout(function() {
				if (!mediaLoadEventFired && self.element.find('img')[0].complete) {
					mediaLoadEvent();
				}
			}, 1000);
		}

		var headlines = this.element.find('h1,h2,h3,h4,h5,h6');
		if (! this.data.name && headlines.length) {
			this.data.name = headlines.text();
		}

		if (this.type === 'video') {

			this.data.video = this.content.attr('data-rsts-video');
			this.videoStartButton = $(document.createElement('a'))
				.attr('href', this.data.video || '')
				.text(this.slider.options.labels.play)
				.addClass(this.slider.options.cssPrefix + 'video-play')
				.on('click', function(event) {
					event.preventDefault();
					self.startVideo();
				})
				.appendTo(this.element);

			if (!this.data.video && this.element.find('video').last().length) {
				this.videoControlsEnabled = !!this.element.find('video').last()[0].controls;
				this.element.find('video').last()[0].controls = false;
				this.element.find('video').last().on('ended', function() {
					self.stopVideo(true);
				});
			}

		}

	};

	/**
	 * @var object regular expressions for video URLs
	 */
	Slide.prototype.videoRegExp = {
		youtube: /^https?:\/\/(?:(?:www\.)?youtube(?:-nocookie)?\.com\/(?:watch\?v=|v\/|embed\/)|youtu\.be\/)([0-9a-z_\-]{11})(?:$|&|\?|#|\/)(?:(?:.*[?&#]|)t=([0-9hms]+))?/i,
		youtubePlayer: /^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/[0-9a-z_\-]{11}/i,
		vimeo: /^https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)(?:.*#t=([0-9hms]+))?/i,
		vimeoPlayer: /^https?:\/\/player\.vimeo\.com\/video\/[0-9]+/i
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
	 * @return boolean true if the slide was already initialized
	 */
	Slide.prototype.isInitialized = function() {
		return !!this.content;
	};

	/**
	 * @return boolean true if all media (currently only images) is loaded
	 */
	Slide.prototype.isMediaLoaded = function() {
		var loaded = true;
		this.element.find('img').each(function() {
			if (this.complete === false) {
				loaded = false;
				return false;
			}
		});
		return loaded;
	};

	/**
	 * get width and height based on width or height
	 * @return object {x: ..., y: ...}
	 */
	Slide.prototype.size = function(x, y, ret) {

		this.updateResponsiveImages(true);

		if (!this.isInjected()) {
			return {
				x: ret ? (x || 0) : x,
				y: ret ? (y || 0) : y
			};
		}

		if (x && ! y) {
			this.slider.modify(this.element, {width: x, height: ''});
			this.scaleContent(x, y);
			if (ret || this.backgrounds.length) {
				y = this.element.outerHeight();
			}
		}
		else if (y && ! x) {
			this.slider.modify(this.element, {height: y, width: ''});
			this.scaleContent(x, y);
			if (ret || this.backgrounds.length) {
				x = this.element.outerWidth();
			}
		}
		else if (x && y) {
			this.slider.modify(this.element, {width: x, height: y});
			this.scaleContent(x, y);
		}
		else {
			this.scaleContent(x, y);
			x = this.element.outerWidth();
			y = this.element.outerHeight();
		}

		this.scaleBackground(x, y);

		return {
			x: x,
			y: y
		};

	};

	/**
	 * update responsive images if picturefill or respimage are present
	 */
	Slide.prototype.updateResponsiveImages = function(reevaluate) {

		var polyfill = window.picturefill || window.respimage;

		if (!polyfill) {
			return;
		}

		polyfill({
			elements: this.element.find('img').get(),
			reevaluate: !!reevaluate
		});

	};

	/**
	 * scale slide contents based on width and height
	 */
	Slide.prototype.scaleContent = function(x, y) {

		if (this.centerContent) {
			if (this.content.css('display') === 'inline') {
				this.content.css('display', 'inline-block');
			}
			var css = {
				'margin-top': '',
				'margin-left': ''
			};
			if (this.centerContent !== 'y' && x) {
				css['margin-left'] = Math.round((x - this.content.outerWidth()) / 2);
			}
			if (this.centerContent !== 'x' && y) {
				css['margin-top'] = Math.round((y - this.content.outerHeight()) / 2);
			}
			this.content.css(css);
		}

		if (this.type === 'video' && !this.data.video) {
			this.element.find('video').last().css({
				width: x,
				height: y,
				display: 'block'
			});
		}
		else if (this.type === 'image' || this.type === 'video') {
			this.scaleImage(this.element.find('img').last(), x, y);
		}

	};

	/**
	 * scale slide backgrounds based on width and height
	 */
	Slide.prototype.scaleBackground = function(x, y) {

		var self = this;

		this.backgrounds.each(function() {
			var element = $(this);
			if (element.is('picture')) {
				element = element.find('img').first();
			}
			self.scaleImage(element, x, y);
		});

	};


	/**
	 * scale an image element based on width, height and scaleMode
	 */
	Slide.prototype.scaleImage = function(image, x, y) {

		var scaleMode = image.attr('data-rsts-scale-mode')
			|| this.slider.options.scaleMode;
		var position = image.attr('data-rsts-position')
			|| this.slider.options.imagePosition;

		var originalSize = this.getOriginalSize(image);
		if (!originalSize.x || !originalSize.y) {
			return;
		}

		var originalProp = originalSize.x / originalSize.y;

		if (x && !y) {
			y = x / originalProp;
		}
		else if (y && !x) {
			x = y * originalProp;
		}
		else if (!x && !y) {
			x = originalSize.x;
			y = originalSize.y;
		}

		var newProp = x / y;

		var css = {
			display: 'block',
			width: originalSize.x,
			height: originalSize.y,
			'min-width': 0,
			'min-height': 0,
			'max-width': 'none',
			'max-height': 'none'
		};

		if (scaleMode === 'fit' || scaleMode === 'crop') {

			if (
				(originalProp >= newProp && scaleMode === 'fit') ||
				(originalProp <= newProp && scaleMode === 'crop')
			) {
				css.width = x;
				css.height = x / originalProp;
			}
			else {
				css.width = y * originalProp;
				css.height = y;
			}

		}
		else if (scaleMode === 'scale') {

			css.width = x;
			css.height = y;

		}

		css['margin-top'] = (y - css.height) / 2;
		css['margin-left'] = (x - css.width) / 2;

		if (position === 'top' || position === 'top-left' || position === 'top-right') {
			css['margin-top'] = 0;
		}
		else if (position === 'bottom' || position === 'bottom-left' || position === 'bottom-right') {
			css['margin-top'] = y - css.height;
		}
		if (position === 'left' || position === 'top-left' || position === 'bottom-left') {
			css['margin-left'] = 0;
		}
		else if (position === 'right' || position === 'top-right' || position === 'bottom-right') {
			css['margin-left'] = x - css.width;
		}

		image.css(css);

	};

	Slide.prototype.getOriginalSize = function(element) {

		element = $(element);
		var size = {};

		if (element[0].nodeName.toLowerCase() === 'img') {

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
		else if (element[0].nodeName.toLowerCase() === 'video') {

			size.x = element[0].videoWidth;
			size.y = element[0].videoHeight;

		}

		if (!size.x || !size.y) {
			if (element.attr('width') || element.attr('height')) {
				size.x = parseFloat(element.attr('width') || element.attr('height'));
				size.y = parseFloat(element.attr('height') || element.attr('width'));
			}
			else {
				size.x = size.y = 0;
			}
		}

		return size;

	};

	/**
	 * @param string state "active", "preactive", or "inactive"
	 */
	Slide.prototype.setState = function(state) {

		// Ensure the preactive state gets applied before the active state
		// to trigger animation styles
		if (state === 'active' && state !== this.state && this.state !== 'preactive') {
			this.setState('preactive');
			// Get a css value to ensure the engine applies the styles
			this.element.css('opacity');
		}

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

		if (!this.isVideoPlaying) {
			return;
		}
		this.isVideoPlaying = false;

		if (this.eventNamespace) {
			$(window).off('message.' + this.eventNamespace);
			delete this.eventNamespace;
		}
		if (!this.data.video) {
			var video = this.element.find('video').last();
			video[0].controls = false;
			video[0].pause();
			video[0].currentTime = 0;
			if (video[0].poster) {
				// Brings the poster image back
				video[0].src = '';
				video.removeAttr('src');
			}
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
		if (this.videoStartButton) {
			this.videoStartButton.css('display', '');
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
		var videoId, apiCallback, matches, time, src;

		if (this.isVideoPlaying) {
			return;
		}
		this.isVideoPlaying = true;

		this.slider.stopAutoplay(true);

		if (!this.data.video) {

			var video = this.element.find('video').last();
			video[0].controls = this.videoControlsEnabled;
			video[0].play();
			this.videoStartButton.css('display', 'none');

		}
		else if ((matches = this.data.video.match(this.videoRegExp.youtube))) {

			this.element.addClass(this.slider.options.cssPrefix + 'video-youtube');

			videoId = matches[1];
			time = matches[2];
			if (time) {
				time = time.split(/[hm]/).reverse();
				time[0] = parseInt(time[0] || 0, 10);
				time[1] = parseInt(time[1] || 0, 10);
				time[2] = parseInt(time[2] || 0, 10);
				time = time[0] + (time[1] * 60) + (time[2] * 60 * 60);
			}

			src = 'https://www.youtube'+(
				this.data.video.indexOf('youtube-nocookie.com') === -1
					? ''
					: '-nocookie'
			)+'.com/embed/' + videoId;
			if (this.data.video.match(this.videoRegExp.youtubePlayer)) {
				src = this.data.video;
			}

			if (!src.match(/[?&]autoplay=/i)) {
				src += (src.match(/\?/) ? '&' : '?') + 'autoplay=1';
			}
			if (!src.match(/[?&]enablejsapi=/i)) {
				src += '&enablejsapi=1';
			}
			if (!src.match(/[?&]wmode=/i)) {
				src += '&wmode=opaque';
			}
			if (time && !src.match(/[?&]start=/i)) {
				src += '&start=' + time;
			}

			this.videoElement = this.createVideoIframe(src).appendTo(this.element);

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
			time = matches[2];

			src = 'https://player.vimeo.com/video/' + videoId;
			if (this.data.video.match(this.videoRegExp.vimeoPlayer)) {
				src = this.data.video;
			}

			if (!src.match(/[?&]autoplay=/i)) {
				src += (src.match(/\?/) ? '&' : '?') + 'autoplay=1';
			}
			if (!src.match(/[?&]api=/i)) {
				src += '&api=1';
			}
			if (time && !src.match(/#t=/i)) {
				src += '#t=' + time;
			}

			this.videoElement = this.createVideoIframe(src).appendTo(this.element);

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

			this.videoElement = this.createVideoIframe(this.data.video).appendTo(this.element);

		}

		this.videoStopButton = $(document.createElement('a'))
			.attr('href', this.data.video || '')
			.text(this.slider.options.labels.stop)
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
	 * @return {jQuery.<HTMLIFrameElement>}
	 */
	Slide.prototype.createVideoIframe = function(src) {
		return $(document.createElement('iframe'))
			.addClass(this.slider.options.cssPrefix + 'video-iframe')
			.attr('frameborder', 0)
			.attr('allowfullscreen', 'allowfullscreen')
			.attr('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen')
			.attr('src', src);
	};

	/**
	 * Set index
	 */
	Slide.prototype.setIndex = function(index) {
		this.data.index = index;
	};

	/**
	 * @return object {}
	 */
	Slide.prototype.getData = function() {
		return this.data;
	};

	/**
	 * @return string URL to thumbnail image
	 */
	Slide.prototype.getThumbUrl = function() {
		return this.data.thumbUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
	};

	/**
	 * @return string HTML of thumbnail
	 */
	Slide.prototype.getThumbHtml = function() {
		return this.data.thumbHtml || $(document.createElement('div')).append(
			$(document.createElement('img'))
				.attr('src', this.getThumbUrl())
				.attr('alt', this.data.name)
		).html();
	};

	return Slide;
})();
