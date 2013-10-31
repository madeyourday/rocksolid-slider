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
				dest: '<%= pkg.name %>-<%= pkg.version %>.js'
			}
		},
		min: {
			build: {
				src: ['<%= pkg.name %>-<%= pkg.version %>.js'],
				dest: '<%= pkg.name %>-<%= pkg.version %>.min.js'
			}
		},
		compass: {
			build: {
				options: {
					config: 'sass/config.rb',
					sassDir: 'sass',
					cssDir: 'css',
					imagesDir: 'img',
					'output-style': 'expanded',
					'no-line-comments': true
				}
			},
			buildmin: {
				options: {
					config: 'sass/config.rb',
					sassDir: 'sass',
					cssDir: 'css-min',
					imagesDir: 'img',
					'output-style': 'compressed'
				}
			}
		},
		copy: {
			buildmin: {
				files: [
					{
						expand: true,
						src: ['css-min/*.css'],
						dest: 'css/',
						rename: function(dest, src) {
							return dest + src.split('/')[1].split('.')[0] + '.min.css';
						}
					}
				]
			}
		},
		clean: {
			buildmin: ['css-min']
		},
		watch: {
			sass: {
				files: ['sass/**/*'],
				tasks: ['compass:build'],
				options: {
					spawn: false
				}
			},
			js: {
				files: ['src/**/*', 'lib/**/*'],
				tasks: ['jshint', 'concat']
			},
			livereload: {
				files: [
					'*.js',
					'css/**/*',
					'img/**/*',
					'example/**/*'
				],
				options: {
					livereload: true
				}
			}
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
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.registerTask('default', ['jshint', 'concat', 'min', 'compass', 'copy', 'clean']);

};
