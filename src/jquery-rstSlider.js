/*
 * Copyright MADE/YOUR/DAY OG <mail@madeyourday.net>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * rstSlider jQuery plugin
 * @param object options Rst.Slider constructor options
 */
$.fn.rstSlider = function(options) {

	var args = arguments;

	return this.each(function() {

		var $this = $(this);
		if (typeof options === "string") {
			var sliderObj = $this.data('rstSlider');
			if (sliderObj && sliderObj[options]) {
				return sliderObj[options].apply(
					sliderObj,
					Array.prototype.slice.call(args, 1)
				);
			}
		}
		else {
			if (! $this.data('rstSlider')) {
				$this.data('rstSlider', new Rst.Slider($this, options));
			}
		}

	});

};
