(function() {
  var Editor, Tool;

  window.Aesop = {
    config: {
      toolbar: {
        buttonClass: 'btn btn-default aesop-tool',
        buttonActiveClass: 'active'
      }
    },
    toolTypes: {},
    registerToolType: function(name, params) {
      params.name = name;
      return this.toolTypes[name] = params;
    },
    Editor: Editor = (function() {
      function Editor(element, toolbar) {
        var t, tool, _i, _len,
          _this = this;
        this.originalValue = element.val();
        this.element = element;
        this.element.data('aesop', this);
        this.frame = $('<iframe/>').css('width', '100%').css('height', '300px');
        this.frame.attr('src', 'javascript:void()');
        this.element.after(this.frame);
        this.document = $(this.frame[0].contentWindow.document);
        this.document[0].designMode = 'on';
        if (this.originalValue) {
          this.document.find('body').html(this.originalValue);
        }
        this.$$tools = {};
        this.$$watchers = [];
        this.$$keyListeners = [];
        this.$$styleWatchers = {};
        this.$$allStyleWatchers = [];
        this.$$tagWatchers = {
          propagated: {},
          non: {}
        };
        this.$$initializeWatchers();
        this.document.find('body').on('click', function(evt) {
          return _this.$$updateWatchers();
        });
        this.element.hide();
        this.element.change(function() {
          return _this.$$updateContentFromElement();
        });
        if ((toolbar != null) && toolbar instanceof Array && toolbar.length) {
          for (_i = 0, _len = toolbar.length; _i < _len; _i++) {
            tool = toolbar[_i];
            if (window.Aesop.toolTypes[tool] != null) {
              t = new window.Aesop.Tool(window.Aesop.toolTypes[tool]);
              this.registerTool(t);
            }
          }
        }
      }

      Editor.prototype.destroy = function() {
        return this.iframe.remove();
      };

      Editor.prototype.blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'BLOCKQUOTE'];

      /*
          PUBLIC API
      */


      Editor.prototype.addStylesheet = function(url) {
        var link;
        link = $('<link/>').attr('rel', 'stylesheet').attr('type', 'text/css').attr('href', url);
        return this.document.find('head').append(link);
      };

      Editor.prototype.addWatcher = function(watcher) {
        return this.$$watchers.push(watcher);
      };

      /*
          Listen for a key combination
      
          @param Array keys       array of key codes or 'ctrl', 'shift', 'alt', 'cmd'
          @param Function action    Action to run when the key combo is pressed
      */


      Editor.prototype.addKeyListener = function(keys, action) {
        var lKeys, listener, _i, _len, _ref;
        keys = keys.sort();
        _ref = this.$$keyListeners;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          listener = _ref[_i];
          lKeys = listener.keys;
          if (_.intersection(keys, lKeys).length === keys.length) {
            console.error('There is already a listener for that key combo!', listener);
            return;
          }
        }
        return this.$$keyListeners.push({
          keys: keys,
          action: action
        });
      };

      /*
          Add a tool to watch for the caret being inside of a certain html tag type.
      
          @param String tag       The tag name (e.g. "h1" or "p")
          @param Boolean propagate  Whether the caret must be directly inside of a tag (false) or if it just 
                        needs to have a parent that matches that tag (true)
          @param Aesop.Tool tool    The tool
      */


      Editor.prototype.addTagWatcher = function(tag, propagate, tool) {
        var el;
        if (propagate) {
          el = this.$$tagWatchers.propagated;
        } else {
          el = this.$$tagWatchers.non;
        }
        if (el[tag.toUpperCase()] == null) {
          el[tag.toUpperCase()] = [];
        }
        return el[tag.toUpperCase()].push(tool);
      };

      /*
          Get the html contents of the editor
      
          @return String
      */


      Editor.prototype.getContents = function() {
        return this.document.find('body').html();
      };

      Editor.prototype.$$addStyleWatcherForProp = function(prop, val, tool) {
        if (this.$$styleWatchers[prop] == null) {
          this.$$styleWatchers[prop] = {};
        }
        if (this.$$styleWatchers[prop][val] == null) {
          this.$$styleWatchers[prop][val] = [];
        }
        return this.$$styleWatchers[prop][val].push(tool);
      };

      Editor.prototype.addStyleWatcher = function(style, tool) {
        var prop, v, val, _i, _len, _results;
        _results = [];
        for (prop in style) {
          val = style[prop];
          if (val instanceof Array) {
            for (_i = 0, _len = val.length; _i < _len; _i++) {
              v = val[_i];
              this.$$addStyleWatcherForProp(prop, v, tool);
            }
          } else {
            this.$$addStyleWatcherForProp(prop, val, tool);
          }
          _results.push(this.$$allStyleWatchers.push(tool));
        }
        return _results;
      };

      Editor.prototype.registerTool = function(tool) {
        if (this.$$tools[tool.name] != null) {
          console.error('Cant register tool with same name! (' + tool.name + ')');
          return;
        }
        tool.editor = this;
        this.$$tools[tool.name] = tool;
        if (tool.keys != null) {
          this.addKeyListener(tool.keys, tool.action);
        }
        if (tool.tag) {
          this.addTagWatcher(tool.tag.tagName, tool.tag.propagate, tool);
        }
        if (tool.style) {
          this.addStyleWatcher(tool.style, tool);
        }
        if (tool.initialize != null) {
          return tool.initialize();
        }
      };

      /*
          @param string name - Name of the tool
          @return Undefined|Object|Aesop.Tool     If you give a name, it will return that tool or undefined.
                                If not, you'll get the whole tools list (object literal with tool names as properties)
      */


      Editor.prototype.getTool = function(name) {
        if (name != null) {
          return this.$$tools[name];
        } else {
          return this.$$tools;
        }
      };

      Editor.prototype.$$updateTagWatchers = function(tagName, type) {
        var name, t, watcher, _i, _len, _ref, _ref1, _results;
        tagName = tagName.toUpperCase();
        if ((this.$$tagWatchers[type][tagName] != null) && this.$$tagWatchers[type][tagName].length) {
          _ref = this.$$tagWatchers[type][tagName];
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            watcher = _ref[_i];
            if (watcher.type != null) {
              _ref1 = this.$$tools;
              for (name in _ref1) {
                t = _ref1[name];
                if (t.type === watcher.type) {
                  t.setActive(false);
                }
              }
            }
            _results.push(watcher.setActive(true));
          }
          return _results;
        }
      };

      Editor.prototype.$$updateWatchers = function() {
        var allStyleWatchers, contents, css, el, matched, p, parentTags, parents, prop, tagName, vals, w, watcher, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2;
        el = this.$getCurrentElement();
        tagName = el[0].tagName;
        this.$$updateTagWatchers(tagName, 'non');
        parents = el.parents();
        parentTags = [];
        for (_i = 0, _len = parents.length; _i < _len; _i++) {
          p = parents[_i];
          parentTags.push(p.tagName);
        }
        parentTags.unshift(tagName);
        parentTags = _.uniq(parentTags);
        for (_j = 0, _len1 = parentTags.length; _j < _len1; _j++) {
          tagName = parentTags[_j];
          this.$$updateTagWatchers(tagName, 'propagated');
        }
        allStyleWatchers = this.$$allStyleWatchers;
        matched = [];
        _ref = this.$$styleWatchers;
        for (prop in _ref) {
          vals = _ref[prop];
          css = el.css(prop);
          if (!css) {
            continue;
          }
          css = css.toString().split(' ')[0];
          if (vals[css] != null) {
            _ref1 = vals[css];
            for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
              w = _ref1[_k];
              matched.push(w);
              w.setActive(true);
            }
          }
        }
        for (_l = 0, _len3 = allStyleWatchers.length; _l < _len3; _l++) {
          w = allStyleWatchers[_l];
          if (matched.indexOf(w) < 0) {
            w.setActive(false);
          }
        }
        _ref2 = this.$$watchers;
        for (_m = 0, _len4 = _ref2.length; _m < _len4; _m++) {
          watcher = _ref2[_m];
          watcher();
        }
        contents = this.getContents();
        if (window.html_beautify != null) {
          contents = window.html_beautify(contents);
        }
        return this.element.html(contents);
      };

      Editor.prototype.$$setCaretToNode = function(node) {
        var range, sel, textRange;
        if ((this.$getSelection() != null) && (this.document[0].createRange != null)) {
          range = this.document[0].createRange();
          range.selectNodeContents(node);
          range.collapse(false);
          sel = this.$getSelection();
          sel.removeAllRanges();
          return sel.addRange(range);
        } else if (this.document[0].createTextRange != null) {
          textRange = this.document[0].body.createTextRange();
          textRange.moveToElementText(node);
          textRange.collapse(false);
          return textRange.select();
        }
      };

      Editor.prototype.$$getContentDocument = function() {
        var iframeDoc;
        iframeDoc = this.frame[0].contentDocument || this.frame[0].contentWindow.document;
        return iframeDoc;
      };

      /*
          TOOL API
      
          These methods (single "$") are meant to be used by tools to apply formatting, add elements, etc
      */


      /*
          @returns Rangy range
      */


      Editor.prototype.$getSelection = function() {
        return window.rangy.getIframeSelection(this.frame[0]);
      };

      /*
          Select the contents of a node (not including the node itself)
      
          Mostly used for testing but you can use it for a tool if you want.
      */


      Editor.prototype.$selectNodeContents = function(node) {
        var sel;
        sel = this.$getSelection();
        return sel.selectAllChildren(node);
      };

      /*
          Select the entire node
      */


      Editor.prototype.$selectNode = function(node) {
        var range;
        range = window.rangy.createRange(this.$$getContentDocument());
        return range.selectNode(node);
      };

      /*
          Execute a basic command.
      
          @param string command
          @param bool defaultUI (not used by any browser, but part of the API)
          @param mixed arg    Optional argument to pass to the browser's execCommand
          @see https://developer.mozilla.org/en-US/docs/Rich-Text_Editing_in_Mozilla
      */


      Editor.prototype.$execCommand = function(command, defaultUI, arg) {
        var el;
        if (defaultUI == null) {
          defaultUI = false;
        }
        if (arg == null) {
          arg = null;
        }
        el = this.$getCurrentElement(false);
        if (!el) {
          return false;
        }
        this.document[0].execCommand(command, defaultUI, arg);
        console.log('Ensuring paragraph');
        this.$$ensureParagraphWrapper();
        return this.$$updateWatchers();
      };

      Editor.prototype.$replaceNode = function(node, replacement) {
        var p;
        console.log('Replacing', node, 'with', replacement);
        p = node.parentNode;
        return p.replaceChild(replacement, node);
      };

      /*
          Unifies block support across browsers
      
          @param string blocktype (e.g. "P", "H1", etc)
          @todo See if we can use native 'formatBlock'
      */


      Editor.prototype.$insertBlock = function(blockType) {
        var caretNode, contents, el, mode, p, parents, prevParent, replacement, tag, _i, _j, _len, _len1, _ref;
        el = this.$getCurrentElement(false);
        if (!el) {
          return false;
        }
        tag = el[0].tagName;
        console.log('Inserting block:', blockType, tag);
        replacement = $('<' + blockType + '/>');
        caretNode = replacement[0];
        if (this.blockTags.indexOf(tag) >= 0) {
          console.log('Found tag in blocktags');
          if (el.text()) {
            contents = el.html();
          } else {
            contents = '<br />';
          }
          replacement.html(contents);
          this.$replaceNode(el[0], replacement[0]);
        } else if (tag === 'DIV') {
          console.log('tag is div');
          replacement.html('<br />');
          this.$replaceNode(el[0], replacement[0]);
          _ref = replacement.parents();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            p = _ref[_i];
            if (this.blockTags.indexOf(p.tagName) >= 0) {
              console.log('Div was inside another block');
              replacement.insertAfter(p);
              break;
            }
          }
        } else if (tag === 'BODY') {
          contents = el.html();
          if (contents.replace(/\s/g, '') === '<br>') {
            contents = '';
          }
          el.html('');
          replacement.html(contents).appendTo(el);
        } else {
          parents = el.parents();
          mode = 'wrap';
          if (parents.length > 2) {
            prevParent = false;
            for (_j = 0, _len1 = parents.length; _j < _len1; _j++) {
              p = parents[_j];
              if (this.blockTags.indexOf(p.tagName) >= 0) {
                el = $(p);
                mode = 'replace';
                if (el.text()) {
                  contents = el.html();
                } else {
                  contents = '<br />';
                }
                break;
              }
              if (p.tagName === 'BODY') {
                el = $(prevParent);
                break;
              }
              prevParent = p;
            }
          }
          if (mode === 'replace') {
            console.log('Mode is replace');
            this.$replaceNode(el[0], replacement[0]);
            replacement.html(contents);
          } else {
            caretNode = this.$getCurrentElement()[0];
            replacement.insertBefore(el);
            replacement.append(el);
          }
        }
        this.$$setCaretToNode(caretNode);
        return this.$$updateWatchers();
      };

      /*
          Gets the html element where the cursor is
      
          @return jQuery Object
      */


      Editor.prototype.$getCurrentElement = function(returnBodyOnNull) {
        var sel;
        if (returnBodyOnNull == null) {
          returnBodyOnNull = true;
        }
        sel = this.$getSelection();
        if (sel.anchorNode) {
          if (sel.anchorNode.nodeType === 3) {
            return $(sel.anchorNode.parentNode);
          }
          return $(sel.anchorNode);
        } else {
          if (returnBodyOnNull) {
            return this.document.find('body');
          }
          return false;
        }
      };

      /*
          Gets the current block element.
      
          @return jQuery Object
      */


      Editor.prototype.$getCurrentBlock = function() {
        var el, p, _i, _len, _ref;
        el = this.$getCurrentElement();
        if (this.blockTags.indexOf(el[0].tagName) >= 0) {
          return el;
        }
        _ref = el.parents();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          if (this.blockTags.indexOf(p.tagName) >= 0) {
            return p;
          }
        }
        return false;
      };

      Editor.prototype.$disableOtherTools = function(exceptFor) {
        var name, tool, _ref, _results;
        _ref = this.$$tools;
        _results = [];
        for (name in _ref) {
          tool = _ref[name];
          if (tool !== exceptFor) {
            _results.push(tool.setDisabled(true));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };

      Editor.prototype.$enableAllTools = function() {
        var name, tool, _ref, _results;
        _ref = this.$$tools;
        _results = [];
        for (name in _ref) {
          tool = _ref[name];
          _results.push(tool.setDisabled(false));
        }
        return _results;
      };

      Editor.prototype.$$initializeWatchers = function() {
        var _this = this;
        this.document.on('keypress', function(e) {
          return _this.$$keypress(e);
        });
        return this.document.on('keyup', function(e) {
          return _this.$$keyup(e);
        });
      };

      Editor.prototype.$$updateContentFromElement = function() {
        var val;
        val = this.element.val();
        return this.document.find('body').html(val);
      };

      Editor.prototype.$$lastEnsureParagraphContents = '';

      Editor.prototype.$$ensureParagraphWrapper = function(evt) {
        if (this.getContents() && this.getContents() === this.$$lastEnsureParagraphContents) {
          return;
        }
        if (this.getContents() === '<p></p>' || this.getContents() === '<p><br/></p>') {
          return;
        }
        console.log('Ensuring paragraph wrapper with contents:', this.getContents());
        this.$$lastEnsureParagraphContents = this.getContents();
        if (!this.getContents() || (this.$getCurrentElement()[0].tagName === 'BODY' && !this.$getCurrentElement().find('p').length)) {
          console.log('First conditional');
          return this.$insertBlock('P');
        } else if (this.$getCurrentElement()[0].tagName === 'DIV' || !this.$getCurrentBlock()) {
          return this.$insertBlock('P');
        }
      };

      Editor.prototype.$$keyup = function(evt) {
        this.$$ensureParagraphWrapper();
        return this.$$updateWatchers();
      };

      Editor.prototype.$$keypress = function(evt) {
        var combo, listener, _i, _len, _ref;
        combo = [evt.which];
        if (evt.ctrlKey) {
          combo.push('ctrl');
        }
        if (evt.altKey) {
          combo.push('alt');
        }
        if (evt.shiftKey) {
          combo.push('shift');
        }
        if (evt.metaKey) {
          combo.push('cmd');
        }
        combo = combo.sort();
        _ref = this.$$keyListeners;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          listener = _ref[_i];
          if (_.intersection(combo, listener.keys).length === combo.length) {
            listener.action(evt);
            return;
          }
        }
      };

      return Editor;

    })(),
    Tool: Tool = (function() {
      /*
          Parameters:
      
            (Array) keys: Array of keys (combo) that triggers this action
            (String) type: If this is specified, this will be disabled if another tool of the same type is enabled
            (Object) tag: { Set the tool to active if current element matches
              (String) tagName: Tag name to listen for (current element in the editor)
              (Boolean) propogate: Whether to go all the way up the DOM to find a matching tag
            }
            (Function) action: Execute the action
      */

      Tool.prototype.active = false;

      Tool.prototype.disabled = false;

      function Tool(params) {
        this.name = params.name;
        this.keys = params.keys;
        if ((params.action != null) && typeof params.action === 'function') {
          this.action = _.bind(params.action, this);
        }
        if ((params.initialize != null) && typeof params.initialize === 'function') {
          this.initialize = _.bind(params.initialize, this);
        }
        if (params.tag != null) {
          this.tag = params.tag;
        }
        if (params.style != null) {
          this.style = params.style;
        }
        if ((params.type != null) && params.type.length) {
          this.type = params.type;
        }
        this.buttonContent = params.buttonContent;
        this.$$watchers = [];
        this.button = $('<button/>').attr('class', window.Aesop.config.toolbar.buttonClass).html(this.buttonContent).click(this.action);
      }

      Tool.prototype.addWatcher = function(watcher) {
        return this.$$watchers.push(watcher);
      };

      Tool.prototype.setActive = function(active) {
        var w, _i, _len, _ref, _results;
        this.active = active;
        if (active) {
          this.button.addClass(window.Aesop.config.toolbar.buttonActiveClass);
        } else {
          this.button.removeClass(window.Aesop.config.toolbar.buttonActiveClass);
        }
        _ref = this.$$watchers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          w = _ref[_i];
          _results.push(w());
        }
        return _results;
      };

      Tool.prototype.setDisabled = function(disabled) {
        var w, _i, _len, _ref, _results;
        this.disabled = disabled;
        if (disabled) {
          this.setActive(false);
          this.button.attr('disabled', 'disabled');
        } else {
          this.button.attr('disabled', false);
        }
        _ref = this.$$watchers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          w = _ref[_i];
          _results.push(w());
        }
        return _results;
      };

      return Tool;

    })()
  };

}).call(this);

(function() {
  window.Aesop.registerToolType('center', {
    style: {
      'text-align': 'center'
    },
    type: 'alignment',
    buttonContent: 'center',
    action: function() {
      return this.editor.$execCommand('justifyCenter');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('left', {
    style: {
      'text-align': 'left'
    },
    type: 'alignment',
    buttonContent: 'left',
    action: function() {
      return this.editor.$execCommand('justifyLeft');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('right', {
    style: {
      'text-align': 'right'
    },
    type: 'alignment',
    buttonContent: 'right',
    action: function() {
      return this.editor.$execCommand('justifyRight');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('h1', {
    tag: {
      tagName: 'H1',
      propagate: true
    },
    type: 'block',
    buttonContent: 'h1',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('H1');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('h2', {
    tag: {
      tagName: 'H2',
      propagate: true
    },
    type: 'block',
    buttonContent: 'h2',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('H2');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('h3', {
    tag: {
      tagName: 'H3',
      propagate: true
    },
    type: 'block',
    buttonContent: 'h3',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('H3');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('h4', {
    tag: {
      tagName: 'H4',
      propagate: true
    },
    type: 'block',
    buttonContent: 'h4',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('H4');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('h5', {
    tag: {
      tagName: 'H5',
      propagate: true
    },
    type: 'block',
    buttonContent: 'h5',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('H5');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('h6', {
    tag: {
      tagName: 'H6',
      propagate: true
    },
    type: 'block',
    buttonContent: 'h6',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('H6');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('p', {
    tag: {
      tagName: 'P',
      propagate: true
    },
    type: 'block',
    buttonContent: 'p',
    action: function() {
      if (!this.active) {
        return this.editor.$insertBlock('P');
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('indent', {
    type: '',
    buttonContent: '&rarr;',
    action: function() {
      var block, current;
      block = this.editor.$getCurrentBlock();
      current = parseInt(block.css('margin-left').toString().replace(/[^0-9\.]/g, ''));
      if (isNaN(current) || !current) {
        current = 0;
      }
      current += 40;
      return block.css('margin-left', current.toString() + 'px');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('outdent', {
    type: '',
    buttonContent: '&larr;',
    action: function() {
      var block, current;
      block = this.editor.$getCurrentBlock();
      current = parseInt(block.css('margin-left').toString().replace(/[^0-9\.]/g, ''));
      if (isNaN(current) || !current) {
        current = 0;
      }
      if (current === 0) {
        return;
      }
      current -= 40;
      return block.css('margin-left', current.toString() + 'px');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('bold', {
    style: {
      'font-weight': ['bold', 700]
    },
    type: '',
    buttonContent: 'b',
    action: function() {
      return this.editor.$execCommand('bold');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('italic', {
    style: {
      'font-style': 'italic'
    },
    type: '',
    buttonContent: 'i',
    action: function() {
      return this.editor.$execCommand('italic');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('underline', {
    style: {
      'text-decoration': 'underline'
    },
    type: '',
    buttonContent: 'u',
    action: function() {
      return this.editor.$execCommand('underline');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('img', {
    tag: {
      tagName: 'IMG',
      propagate: true
    },
    type: '',
    buttonContent: 'img',
    initialize: function() {
      return this.editor.document.find('body').on('click', 'img', function(e) {
        return console.log('GOT IMAGE CLICK');
      });
    },
    action: function() {
      var url;
      url = prompt('Enter URL');
      if (url) {
        this.editor.$execCommand('insertImage', null, url);
        return this.editor.$;
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('link', {
    tag: {
      tagName: 'A',
      propagate: true
    },
    type: '',
    buttonContent: 'a',
    action: function() {
      var url;
      url = prompt('Enter URL');
      if (url) {
        return this.editor.$execCommand('createLink', null, url);
      }
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('ol', {
    tag: {
      tagName: 'OL',
      propagate: true
    },
    type: 'list',
    buttonContent: 'ol',
    action: function() {
      if (this.active) {
        this.setActive(false);
      }
      return this.editor.$execCommand('insertOrderedList');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('ul', {
    tag: {
      tagName: 'UL',
      propagate: true
    },
    type: 'list',
    buttonContent: 'ul',
    action: function() {
      if (this.active) {
        this.setActive(false);
      }
      return this.editor.$execCommand('insertUnorderedList');
    }
  });

}).call(this);

(function() {
  window.Aesop.registerToolType('html', {
    buttonContent: 'html',
    action: function() {
      if (this.active) {
        this.editor.$enableAllTools();
        this.editor.element.hide();
        this.editor.frame.show();
        return this.active = false;
      } else {
        this.active = true;
        this.editor.$disableOtherTools(this);
        this.editor.element.show();
        return this.editor.frame.hide();
      }
    }
  });

}).call(this);
