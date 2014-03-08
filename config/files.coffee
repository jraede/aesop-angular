
module.exports = require(process.env['LINEMAN_MAIN']).config.extend 'files', 
	
	js: 
		vendor: [

			
			"vendor/js/jquery.1.11.0.js",
			"vendor/js/angular.1.2.12.js",
			"vendor/js/underscore.js.js",
			"vendor/js/rangy.js",
			"vendor/js/underscore.js",
			"vendor/js/beautify_html.js",
			"vendor/js/aesop.js"

		]
		minified: "dist/js/aesop-angular.min.js"
		minifiedWebRelative: "js/aesop-angular.min.js"


	# concat:
	# 	js:
	# 		src: ["<%= files.js.vendor %>", "<%= files.ngtemplates.dest %>", "<%= files.coffee.generated %>", "<%= files.js.app %>"]
	css:
		vendor: "vendor/css/**/*.css"
		app: "app/css/main.css"
		concatenated: "generated/css/app.css"
		minified: "dist/css/app.css"
		minifiedWebRelative: "css/app.css"
	less:
		app: "app/css/main.less"
		vendor: [
			"vendor/css/**/*.less"
		]
		generatedApp: "generated/css/app.less.css"
		generatedVendor: "generated/css/vendor.less.css"


	
