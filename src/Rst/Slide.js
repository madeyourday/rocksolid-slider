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

		this.data = {
			name: $(element).attr('alt')
		};

		this.type = 'default';
		if (element.tagName.toLowerCase() === 'img') {
			this.type = 'image';
		}

		this.element = $(document.createElement('div'))
			.addClass(slider.options.cssPrefix + 'slide')
			.addClass(slider.options.cssPrefix + 'slide-' + this.type)
			.append(element);

		this.element.find('img').on('load', function(){
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
			this.slider.modify(this.element, {width: x});
			if (ret) {
				y = this.element.height();
			}
		}
		else if (y && ! x) {
			this.slider.modify(this.element, {height: y});
			if (ret) {
				x = this.element.width();
			}
		}
		else if (x && y) {
			this.slider.modify(this.element, {width: x, height: y});
			this.scaleContent(x, y);
		}
		else if(ret) {
			x = this.element.width();
			y = this.element.height();
		}

		return {
			x: x,
			y: y
		};

	};

	/**
	 * scale slide contents based on width and height
	 */
	Slide.prototype.scaleContent = function(x, y) {

		var originalSize, originalProp, newProp, css;
		var image = this.element.find('img').first();
		var scaleMode = this.slider.options.scaleMode;

		if (this.type === 'image') {

			image.css(css = {
				width: 'auto',
				'max-width': 'none',
				'min-width': 0,
				height: 'auto',
				'max-height': 'none',
				'min-height': 0,
				'margin-left': 0,
				'margin-top': 0
			});
			css['max-width'] = css['min-width'] = '';
			css['max-height'] = css['min-height'] = '';

			originalSize = {
				x: image.width(),
				y: image.height()
			};
			originalProp = originalSize.x / originalSize.y;
			newProp = x / y;

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

			image.css(css);

		}

	};

	/**
	 * @return object {}
	 */
	Slide.prototype.getData = function() {
		return this.data;
	};

	return Slide;
})();
