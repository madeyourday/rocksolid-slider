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
		this.elements = {
			prev: $(document.createElement('a'))
				.attr('href', '')
				.text('<')
				.addClass(slider.options.cssPrefix + 'nav-prev')
				.on('click', function(event){
					event.preventDefault();
					self.slider.prev();
				}),
			next: $(document.createElement('a'))
				.attr('href', '')
				.text('>')
				.on('click', function(event){
					event.preventDefault();
					self.slider.next();
				})
				.addClass(slider.options.cssPrefix + 'nav-next'),
			main: $(document.createElement('div'))
				.addClass(slider.options.cssPrefix + 'nav')
		};

		var navUl = document.createElement('ul');
		$.each(this.slider.getSlides(), function(i, slide){
			self.elements[i] = self.createNavItem(i, slide.getData()).appendTo(navUl);
		});

		this.elements.main.append(navUl);
		slider.elements.main
			.append(this.elements.prev)
			.append(this.elements.next)
			.append(this.elements.main);

	}

	/**
	 * create a navigation item
	 * @return jQuery element
	 */
	SliderNav.prototype.createNavItem = function(index, data) {

		var self = this;

		return $(document.createElement('li')).append(
			$(document.createElement('a'))
				.attr('href', '')
				.text(data.name ? data.name : (index + 1))
				.on('click', function(event){
					event.preventDefault();
					self.slider.goTo(index);
				})
		);

	};

	return SliderNav;
})();
