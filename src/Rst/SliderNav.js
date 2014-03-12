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
		var slides = this.slider.getSlides();

		if (this.activeIndexes) {
			$.each(this.activeIndexes, function(i, index) {
				if (!self.elements[index]) {
					return;
				}
				self.elements[index].children('a').removeClass('active');
			});
		}

		if (
			this.elements[slides.length]
			&& $.inArray(slides.length - 1, indexes) !== -1
		) {
			indexes = [slides.length];
		}

		this.activeIndexes = indexes;

		var visibleActive = false;
		$.each(this.activeIndexes, function(i, index) {
			if (!self.elements[index]) {
				return;
			}
			if (self.elements[index][0].style.display !== 'none') {
				visibleActive = true;
			}
			self.elements[index].children('a').addClass('active');
		});

		// No visible item is active so we activate the last one
		if (!visibleActive && this.elements[slides.length]) {
			$.each(this.activeIndexes, function(i, index) {
				if (!self.elements[index]) {
					return;
				}
				self.elements[index].children('a').removeClass('active');
			});
			this.activeIndexes = [slides.length];
			this.elements[slides.length].children('a').addClass('active');
		}

	};

	/**
	 * combine navigation items
	 */
	SliderNav.prototype.combineItems = function() {

		if (!this.elements[0]) {
			return;
		}

		var visibleCount = this.slider.getVisibleSlidesCount();
		var slides = this.slider.getSlides();

		if (this.elements[slides.length]) {
			this.elements[slides.length].remove();
			delete this.elements[slides.length];
		}

		$.each(this.elements, function() {
			this.css('display', '');
		});

		if (visibleCount < 2 || !this.slider.options.combineNavItems) {
			return;
		}

		var lastIndex;
		for (var i = 0; this.elements[i]; i++) {
			if (
				(i - Math.floor((visibleCount - 1) / 2)) % visibleCount
				|| (i - Math.floor((visibleCount - 1) / 2)) > slides.length - visibleCount
			) {
				this.elements[i].css('display', 'none');
			}
			else {
				lastIndex = i;
			}
		}

		if (slides.length % visibleCount === 0) {
			this.elements[
				slides.length - visibleCount
				+ Math.floor((visibleCount - 1) / 2)
			].css('display', '');
		}
		else {
			var newIndex = slides.length
				- (slides.length % visibleCount || visibleCount)
				+ Math.floor((visibleCount - 1) / 2);
			this.elements[slides.length] = this.createNavItem(
				newIndex,
				slides[newIndex >= slides.length ? slides.length - 1 : newIndex].getData()
			).insertAfter(this.elements[slides.length - 1]);
		}

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
					(data.index + 1)
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
