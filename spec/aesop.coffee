# describe 'Aesop', ->
# 	$scope = null
# 	$element = null
# 	beforeEach module 'aesop'

# 	beforeEach inject ($rootScope, $compile) ->
# 		$scope = $rootScope.$new()


# 	compileDirective = (tpl) ->
# 		if !tpl
# 			tpl = '<div aesop tools="\'asdf\'"><button aesop-tool="bold">Bold</button></div>'
# 		inject ($compile) ->
# 			$element = $compile(tpl)($scope)

# 	describe 'Test', ->
# 		beforeEach ->
# 			compileDirective()

# 		it 'should copy scope items to the buttons', ->
			
