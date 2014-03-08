module.exports = (lineman) ->
	config:
		loadNpmTasks: lineman.config.application.loadNpmTasks.concat("grunt-contrib-copy")
		uglify:
			options:
				banner: "<%= meta.banner %>"
			js:
				files:
						"<%= files.js.minified %>": "<%= files.coffee.generated %>"

		prependTasks:
			dist:['copy:unminified']
		copy:
			unminified:
				src: 'generated/js/app.coffee.js'
				dest: 'dist/js/aesop-angular.js'
				rename:'aesop-angular.js'
