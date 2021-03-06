angular.module('aesop', [])

# Expose the Aesop object as a module
angular.module('aesop').factory '$aesop', ['$window', ($window) ->
	return $window.Aesop
]

# Directive for text editor wrapper
angular.module('aesop').directive 'aesop', ['$compile', '$timeout', ($compile, $timeout) ->
	def =
		scope:
			tools:'='
			ngModel:'='
		link:(scope, element, attrs) ->

			tools = scope.tools
			if typeof tools is 'string'
				tools = tools.split(',')
			scope.toolbar = tools

			el = $compile('<textarea ng-model="ngModel"/>')(scope)

			element.append(el)
			scope.element = el
			scope.stylesheet = attrs.stylesheet
			scope.$initialize()



		controller: ['$scope', '$aesop', '$compile', '$timeout', '$rootScope', ($scope, $aesop, $compile, $timeout, $rootScope)->


			$scope.$initialize = =>
				@editor = new $aesop.Editor($scope.element, $scope.toolbar)
				@editor.addWatcher =>
					$timeout =>
						$scope.ngModel = @editor.getContents()
				$scope.$watch 'ngModel', (newVal, oldVal) ->
					if @editor.getContents() isnt newVal
						@editor.document.find('body').html(newVal)

				if $scope.stylesheet 
					@editor.addStylesheet($scope.stylesheet)
				
				$rootScope.$broadcast('$editorReady')


				$scope.$on '$destroy', =>
					@editor.destroy()
					@editor = null
			return
		]
]



angular.module('aesop').directive 'aesopTool', ['$timeout', ($timeout) ->
	def =
		scope:true
		require: '^aesop'

		link:(scope, element, attrs, aesopCtrl) ->
			scope.$on '$editorReady', ->
				tool = aesopCtrl.editor.getTool(attrs.aesopTool)

				scope.active = false
				tool.addWatcher ->
					if tool.disabled
						$timeout ->
							element.attr('disabled', 'disabled')
					else
						$timeout ->
							element.attr('disabled', false)

					if tool.active
						$timeout ->
							scope.active = true
					else
						$timeout ->
							scope.active = false

				element.click ->
					tool.action()
]


