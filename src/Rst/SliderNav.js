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
		this.activeIndex = null;
		this.elements = {
			prev: $(document.createElement('a'))
				.attr('href', '')
				.text('prev')
				.addClass(slider.options.cssPrefix + 'nav-prev')
				.on('click', function(event){
					event.preventDefault();
					self.slider.prev();
				}),
			next: $(document.createElement('a'))
				.attr('href', '')
				.text('next')
				.on('click', function(event){
					event.preventDefault();
					self.slider.next();
				})
				.addClass(slider.options.cssPrefix + 'nav-next'),
			main: $(document.createElement('div'))
				.addClass(
					slider.options.cssPrefix + 'nav ' +
					slider.options.cssPrefix + 'nav-' + slider.options.navType
				)
		};

		var navUl = document.createElement('ul');
		$.each(this.slider.getSlides(), function(i, slide){
			self.elements[i] = self.createNavItem(i, slide.getData()).appendTo(navUl);
		});

		this.elements.main.append(navUl);
		slider.elements.main.append(this.elements.main);
		slider.elements.view
			.append(this.elements.prev)
			.append(this.elements.next);

	}

	/**
	 * set active nav element
	 */
	SliderNav.prototype.setActive = function(index) {

		if (typeof this.activeIndex === 'number') {
			this.elements[this.activeIndex].children('a').removeClass('active');
		}

		this.activeIndex = index;
		this.elements[this.activeIndex].children('a').addClass('active');

	};

	/**
	 * set
	 * @return jQuery element
	 */
	SliderNav.prototype.createNavItem = function(index, data) {

		var self = this;

		return $(document.createElement('li')).append(
			$(document.createElement('a'))
				.attr('href', '')
				.text((self.slider.options.navType !== 'numbers' && data.name) ?
					data.name :
					(index + 1)
				)
				.on('click', function(event){
					event.preventDefault();
					self.slider.goTo(index);
				})
		);

	};

	/**
	 * get size
	 * @return object {x: ..., y: ...}
	 */
	SliderNav.prototype.getSize = function() {

		if (this.elements.main.css('position') === 'absolute') {
			return {x: 0, y: 0};
		}

		return {
			x: this.elements.main.outerWidth(true),
			y: this.elements.main.outerHeight(true)
		};

	};

	return SliderNav;
})();
