/*
 * Copyright MADE/YOUR/DAY OG <mail@madeyourday.net>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Rst.SliderNav Class
 */
Rst.SliderNav = (function() {

	/**
	 * Rst.SliderNav Constructor
	 * @param Rst.Slider slider slider instance
	 */
	function SliderNav(slider) {

		var self = this;

		this.slider = slider;
		this.elements = {};

		if (slider.options.controls) {

			this.elements.prev = $(document.createElement('a'))
				.attr('href', '')
				.text('prev')
				.addClass(slider.options.cssPrefix + 'prev')
				.on('click', function(event){
					event.preventDefault();
					self.slider.prev();
				});

			this.elements.next = $(document.createElement('a'))
				.attr('href', '')
				.text('next')
				.on('click', function(event){
					event.preventDefault();
					self.slider.next();
				})
				.addClass(slider.options.cssPrefix + 'next');

			slider.elements.view
				.append(this.elements.prev)
				.append(this.elements.next);

		}

		if (slider.options.navType !== 'none') {

			this.elements.main = $(document.createElement('div'))
				.addClass(
					slider.options.cssPrefix + 'nav ' +
					slider.options.cssPrefix + 'nav-' + slider.options.navType
				);

			this.elements.mainPrev = $(document.createElement('a'))
				.attr('href', '')
				.text('prev')
				.on('click', function(event){
					event.preventDefault();
					self.slider.prev();
				})
				.appendTo(
					$(document.createElement('li'))
						.addClass(slider.options.cssPrefix + 'nav-prev')
				);

			this.elements.mainNext = $(document.createElement('a'))
				.attr('href', '')
				.text('next')
				.on('click', function(event){
					event.preventDefault();
					self.slider.next();
				})
				.appendTo(
					$(document.createElement('li'))
						.addClass(slider.options.cssPrefix + 'nav-next')
				);

			var navUl = document.createElement('ul');
			$.each(this.slider.getSlides(), function(i, slide){
				self.elements[i] = self.createNavItem(i, slide.getData())
					.appendTo(navUl);
			});

			this.elements.mainPrev.parent().prependTo(navUl);
			this.elements.mainNext.parent().appendTo(navUl);

			this.elements.main.append(navUl);
			slider.elements.main.append(this.elements.main);

		}

	}

	/**
	 * set active nav elements
	 */
	SliderNav.prototype.setActive = function(indexes) {

		var self = this;

		if (this.activeIndexes) {
			$.each(this.activeIndexes, function(i, index) {
				if (!self.elements[index]) {
					return;
				}
				self.elements[index].children('a').removeClass('active');
			});
		}

		this.activeIndexes = indexes;
		$.each(this.activeIndexes, function(i, index) {
			if (!self.elements[index]) {
				return;
			}
			self.elements[index].children('a').addClass('active');
		});

	};

	/**
	 * set
	 * @return jQuery element
	 */
	SliderNav.prototype.createNavItem = function(index, data) {

		var self = this;

		return $(document.createElement('li'))
			.addClass(self.slider.options.cssPrefix + 'nav-item')
			.append($(document.createElement('a'))
				.attr('href', '')
				.text((self.slider.options.navType !== 'numbers' && data.name) ?
					data.name :
					(index + 1)
				)
				.on('click', function(event){
					event.preventDefault();
					var visibleCount = self.slider.getVisibleSlidesCount();
					var goTo = index - Math.floor(
						(visibleCount - 1) / 2
					);
					if (!self.slider.options.loop) {
						goTo = Math.min(
							self.slider.slides.length - visibleCount,
							Math.max(0, goTo)
						);
					}
					else {
						if (goTo < 0) {
							goTo += self.slider.slides.length;
						}
						else if (goTo >= self.slider.slides.length) {
							goTo -= self.slider.slides.length;
						}
					}
					self.slider.goTo(goTo);
				})
			);

	};

	/**
	 * get size
	 * @return object {x: ..., y: ...}
	 */
	SliderNav.prototype.getSize = function() {

		if (
			!this.elements.main
			|| this.elements.main.css('position') === 'absolute'
		) {
			return {x: 0, y: 0};
		}

		return {
			x: this.elements.main.outerWidth(true),
			y: this.elements.main.outerHeight(true)
		};

	};

	return SliderNav;
})();
