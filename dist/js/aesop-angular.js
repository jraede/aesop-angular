(function() {
  angular.module('aesop', []);

  angular.module('aesop').factory('$aesop', [
    '$window', function($window) {
      return $window.Aesop;
    }
  ]);

  angular.module('aesop').directive('aesop', [
    '$compile', '$timeout', function($compile, $timeout) {
      var def;
      return def = {
        scope: {
          tools: '=',
          ngModel: '='
        },
        link: function(scope, element, attrs) {
          var el, tools;
          tools = scope.tools;
          if (typeof tools === 'string') {
            tools = tools.split(',');
          }
          scope.toolbar = tools;
          el = $compile('<textarea ng-model="ngModel"/>')(scope);
          element.append(el);
          scope.element = el;
          scope.stylesheet = attrs.stylesheet;
          return scope.$initialize();
        },
        controller: [
          '$scope', '$aesop', '$compile', '$timeout', '$rootScope', function($scope, $aesop, $compile, $timeout, $rootScope) {
            var _this = this;
            $scope.$initialize = function() {
              _this.editor = new $aesop.Editor($scope.element, $scope.toolbar);
              _this.editor.addWatcher(function() {
                return $timeout(function() {
                  return $scope.ngModel = _this.editor.getContents();
                });
              });
              if ($scope.stylesheet) {
                _this.editor.addStylesheet($scope.stylesheet);
              }
              $rootScope.$broadcast('$editorReady');
              return $scope.$on('$destroy', function() {
                _this.editor.destroy();
                return _this.editor = null;
              });
            };
          }
        ]
      };
    }
  ]);

  angular.module('aesop').directive('aesopTool', [
    '$timeout', function($timeout) {
      var def;
      return def = {
        scope: true,
        require: '^aesop',
        link: function(scope, element, attrs, aesopCtrl) {
          return scope.$on('$editorReady', function() {
            var tool;
            tool = aesopCtrl.editor.getTool(attrs.aesopTool);
            scope.active = false;
            tool.addWatcher(function() {
              if (tool.disabled) {
                $timeout(function() {
                  return element.attr('disabled', 'disabled');
                });
              } else {
                $timeout(function() {
                  return element.attr('disabled', false);
                });
              }
              if (tool.active) {
                return $timeout(function() {
                  return scope.active = true;
                });
              } else {
                return $timeout(function() {
                  return scope.active = false;
                });
              }
            });
            return element.click(function() {
              return tool.action();
            });
          });
        }
      };
    }
  ]);

}).call(this);
