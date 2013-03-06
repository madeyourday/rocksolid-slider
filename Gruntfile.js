module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				banner: '/*! <%= pkg.name %> v<%= pkg.version %> */\n'
			},
			build: {
				src: [
					'src/header.js',
					'src/Rst/*.js',
					'src/jquery-rstSlider.js',
					'src/footer.js',
					'lib/jquery-ui-effect-easing-v1.10.1.js'
				],
				dest: '<%= pkg.name %>.js'
			}
		},
		min: {
			build: {
				src: ['<%= pkg.name %>.js'],
				dest: '<%= pkg.name %>.min.js'
			}
		},
		compass: {
			build: {
				options: {
					config: 'sass/config.rb',
					sassDir: 'sass',
					cssDir: 'css'
				}
			}
		},
		watch: {
			files: ['src/**/*', 'lib/**/*', 'sass/**/*'],
			tasks: ['jshint', 'concat', 'compass']
		},
		jshint: {
			files: ['src/Rst/*.js', 'src/jquery-rstSlider.js']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-yui-compressor');
	grunt.loadNpmTasks('grunt-contrib-compass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', ['jshint', 'concat', 'min', 'compass']);

};
