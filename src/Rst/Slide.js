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

		this.slider = slider;

		this.element = $(document.createElement('div'))
			.addClass('rsts-slide')
			.append(element);

		this.element.children('img').on('load', function(){
			slider.resize();
		});

	}

	/**
	 * get width and height based on width or height
	 * @return object {x: ..., y: ...}
	 */
	Slide.prototype.size = function(x, y, ret) {

		if (x === true) {
			x = null;
			ret = true;
		}

		if (x && ! y) {
			this.element.width(x);
			if (ret) {
				y = this.element.height();
			}
		}
		else if (y && ! x) {
			this.element.height(y);
			if (ret) {
				x = this.element.width();
			}
		}
		else if(ret) {
			x = this.element.width();
			y = this.element.height();
		}

		if (ret) {
			return {
				x: x,
				y: y
			};
		}

	};

	/**
	 * @return object {}
	 */
	Slide.prototype.getData = function() {
		return {};
	};

	return Slide;
})();
