/*!
 * ngTagsInput v2.0.1
 * 
 *
 * Copyright (c) 2014-2014 Nate Dudenhoeffer
 *
 * Copyright (c) 2013-2014 Michael Benford
 * License: MIT
 *
 * Generated at 2014-06-10 10:52:42 -0500
 */
(function() {
'use strict';

var KEYS = {
    backspace: 8,
    tab: 9,
    enter: 13,
    escape: 27,
    space: 32,
    up: 38,
    down: 40,
    comma: 188,
    period: 190,
    dot: 110
};

function SimplePubSub() {
    var events = {};
    return {
        on: function(names, handler) {
            names.split(' ').forEach(function(name) {
                if (!events[name]) {
                    events[name] = [];
                }
                events[name].push(handler);
            });
            return this;
        },
        trigger: function(name, args) {
            angular.forEach(events[name], function(handler) {
                handler.call(null, args);
            });
            return this;
        }
    };
}

function makeObjectArray(array, key) {
    array = array || [];
    if (array.length > 0 && !angular.isObject(array[0])) {
        array.forEach(function(item, index) {
            array[index] = {};
            array[index][key] = item;
        });
    }
    return array;
}

function findInObjectArray(array, obj, key) {
    var item = null;
    for (var i = 0; i < array.length; i++) {
        // I'm aware of the internationalization issues regarding toLowerCase()
        // but I couldn't come up with a better solution right now
        if (array[i][key].toLowerCase() === obj[key].toLowerCase()) {
            item = array[i];
            break;
        }
    }
    return item;
}

function replaceAll(str, substr, newSubstr) {
    var expression = substr.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
    return str.replace(new RegExp(expression, 'gi'), newSubstr);
}


var tagsInput = angular.module('ngTagsInput', []);

/**
 * @ngdoc directive
 * @name tagsInput
 * @module ngTagsInput
 *
 * @description
 * Renders an input box with tag editing support.
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} [displayProperty=text] Property to be rendered as the tag label.
 * @param {number=} tabindex Tab order of the control.
 * @param {string=} [placeholder=Add a tag] Placeholder text for the control.
 * @param {number=} [minLength=3] Minimum length for a new tag.
 * @param {number=} maxLength Maximum length allowed for a new tag.
 * @param {number=} minTags Sets minTags validation error key if the number of tags added is less than minTags.
 * @param {number=} maxTags Sets maxTags validation error key if the number of tags added is greater than maxTags.
 * @param {boolean=} [allowLeftoverText=false] Sets leftoverText validation error key if there is any leftover text in
 *                                             the input element when the directive loses focus.
 * @param {string=} [removeTagSymbol=×] Symbol character for the remove tag button.
 * @param {boolean=} [addOnEnter=true] Flag indicating that a new tag will be added on pressing the ENTER key.
 * @param {boolean=} [addOnSpace=false] Flag indicating that a new tag will be added on pressing the SPACE key.
 * @param {boolean=} [addOnComma=true] Flag indicating that a new tag will be added on pressing the COMMA key.
 * @param {boolean=} [addOnBlur=true] Flag indicating that a new tag will be added when the input field loses focus.
 * @param {boolean=} [replaceSpacesWithDashes=true] Flag indicating that spaces will be replaced with dashes.
 * @param {string=} [allowedTagsPattern=.+] Regular expression that determines whether a new tag is valid.
 * @param {boolean=} [enableEditingLastTag=false] Flag indicating that the last tag will be moved back into
 *                                                the new tag input box instead of being removed when the backspace key
 *                                                is pressed and the input box is empty.
 * @param {boolean=} [addFromAutocompleteOnly=false] Flag indicating that only tags coming from the autocomplete list will be allowed.
 *                                                   When this flag is true, addOnEnter, addOnComma, addOnSpace, addOnBlur and
 *                                                   allowLeftoverText values are ignored.
 * @param {expression} onTagAdded Expression to evaluate upon adding a new tag. The new tag is available as $tag.
 * @param {expression} onTagRemoved Expression to evaluate upon removing an existing tag. The removed tag is available as $tag.
 */
tagsInput.directive('tagsInput', ["$timeout","$document","tagsInputConfig", function($timeout, $document, tagsInputConfig) {
    function TagList(options, events) {
        var self = {}, getTagText, setTagText, tagIsValid;

        getTagText = function(tag) {
            return tag[options.displayProperty];
        };

        setTagText = function(tag, text) {
            tag[options.displayProperty] = text;
        };

        tagIsValid = function(tag) {
            var tagText = getTagText(tag);

            return tagText.length >= options.minLength &&
                   tagText.length <= (options.maxLength || tagText.length) &&
                   options.allowedTagsPattern.test(tagText) &&
                   !findInObjectArray(self.items, tag, options.displayProperty);
        };

        self.items = [];

        self.addText = function(text) {
            var tag = {};
            setTagText(tag, text);
            return self.add(tag);
        };

        self.add = function(tag) {
            var tagText = getTagText(tag).trim();

            if (options.replaceSpacesWithDashes) {
                tagText = tagText.replace(/\s/g, '-');
            }

            setTagText(tag, tagText);

            if (tagIsValid(tag)) {
                self.items.push(tag);
                events.trigger('tag-added', { $tag: tag });
            }
            else {
                events.trigger('invalid-tag', { $tag: tag });
            }

            return tag;
        };

        self.remove = function(index) {
            var tag = self.items.splice(index, 1)[0];
            events.trigger('tag-removed', { $tag: tag });
            return tag;
        };

        self.removeLast = function() {
            var tag, lastTagIndex = self.items.length - 1;

            if (options.enableEditingLastTag || self.selected) {
                self.selected = null;
                tag = self.remove(lastTagIndex);
            }
            else if (!self.selected) {
                self.selected = self.items[lastTagIndex];
            }

            return tag;
        };

        return self;
    }

    return {
        restrict: 'E',
        require: 'ngModel',
        scope: {
            tags: '=ngModel',
            onTagAdded: '&',
            onTagRemoved: '&',
            source: '='
        },
        replace: false,
        transclude: true,
        templateUrl: 'ngTagsInput/tags-input.html',
        controller: ["$scope","$attrs","$element", function($scope, $attrs, $element) {
            tagsInputConfig.load('tagsInput', $scope, $attrs, {
                placeholder: [String, ''],
                tabindex: [Number],
                removeTagSymbol: [String, String.fromCharCode(215)],
                replaceSpacesWithDashes: [Boolean, true],
                minLength: [Number, 2],
                maxLength: [Number],
                addOnEnter: [Boolean, true],
                addOnSpace: [Boolean, true],
                addOnComma: [Boolean, true],
                addOnPeriod: [Boolean, true],
                addOnBlur: [Boolean, true],
                allowedTagsPattern: [RegExp, /.+/],
                enableEditingLastTag: [Boolean, false],
                minTags: [Number],
                maxTags: [Number],
                displayProperty: [String, 'text'],
                allowLeftoverText: [Boolean, false],
                addFromAutocompleteOnly: [Boolean, true],
                showAll: [Boolean, true],
                debounceDelay: [Number, 100],
                minSearchLength: [Number, 3],
                highlightMatchedText: [Boolean, true],
                maxResultsToShow: [Number, 10],
            });

            $scope.events = new SimplePubSub();
            $scope.tagList = new TagList($scope.options, $scope.events);

            this.registerAutocomplete = function(toggleFunc) {
                $scope.toggleSuggestionList = toggleFunc;
                var input = $element.find('input');
                input.on('keydown', function(e) {
                    $scope.events.trigger('input-keydown', e);
                });

                return {
                    addTag: function(tag) {
                        return $scope.tagList.add(tag);
                    },
                    focusInput: function() {
                        input[0].focus();
                    },
                    getTags: function() {
                        return $scope.tags;
                    },
                    getOptions: function() {
                        return $scope.options;
                    },
                    on: function(name, handler) {
                        $scope.events.on(name, handler);
                        return this;
                    }
                };
            };
        }],
        link: {
          post: function(scope, element, attrs, ngModelCtrl) {
            var hotkeys = [KEYS.enter, KEYS.comma, KEYS.space, KEYS.backspace, KEYS.period, KEYS.dot],
                tagList = scope.tagList,
                events = scope.events,
                options = scope.options,
                input = element.find('input');
            
            if ( attrs.source == "options" ){
              var tagsModel = [];
              if ( !ngModelCtrl.$isEmpty() ){
                tagsModel = ngModelCtrl.$viewValue;
              }
              scope.source = [];
              angular.forEach(element.find('option'),function(opt, index){
                var optObj = {value: opt.value, text: opt.label};
                scope.source.push(optObj);
                if ( opt.selected ){
                  tagsModel.push(optObj);
                }
                opt.remove();
                ngModelCtrl.$setViewValue(tagsModel);
              });
            };
            
            events
                .on('tag-added', scope.onTagAdded)
                .on('tag-removed', scope.onTagRemoved)
                .on('tag-added', function() {
                    scope.newTag.text = '';
                })
                .on('tag-added tag-removed', function() {
                    ngModelCtrl.$setViewValue(scope.tags);
                    if ( scope.tags.length >= options.maxTags ){
                      scope.newTag.readonly = true;
                    }
                    else{
                      scope.newTag.readonly = false;
                    }
                })
                .on('invalid-tag', function() {
                    scope.newTag.invalid = true;
                })
                .on('input-change', function() {
                    tagList.selected = null;
                    scope.newTag.invalid = null;
                })
                .on('input-focus', function() {
                    ngModelCtrl.$setValidity('leftoverText', true);
                })
                .on('input-blur', function() {
                    if (!options.addFromAutocompleteOnly) {
                        if (options.addOnBlur) {
                            tagList.addText(scope.newTag.text);
                        }

                        ngModelCtrl.$setValidity('leftoverText', options.allowLeftoverText ? true : !scope.newTag.text);
                    }
                });

            scope.newTag = { text: '', invalid: null, readonly: false, };

            scope.getDisplayText = function(tag) {
                return tag[options.displayProperty].trim();
            };

            scope.track = function(tag) {
                return tag[options.displayProperty];
            };

            scope.newTagChange = function() {
                events.trigger('input-change', scope.newTag.text);
            };

            scope.$watch('tags', function(value) {
                scope.tags = makeObjectArray(value, options.displayProperty);
                tagList.items = scope.tags;
            });

            scope.$watch('tags.length', function(value) {
                ngModelCtrl.$setValidity('maxTags', angular.isUndefined(options.maxTags) || value <= options.maxTags);
                ngModelCtrl.$setValidity('minTags', angular.isUndefined(options.minTags) || value >= options.minTags);
            });
            
            var addKeys = {};
            addKeys[KEYS.enter] = options.addOnEnter;
            addKeys[KEYS.comma] = options.addOnComma;
            addKeys[KEYS.space] = options.addOnSpace;
            addKeys[KEYS.period] = options.addOnPeriod;
            addKeys[KEYS.dot] = options.addOnPeriod;
            scope.addKeys = addKeys;
            
            input
                .on('keydown', function(e) {
                    // This hack is needed because jqLite doesn't implement stopImmediatePropagation properly.
                    // I've sent a PR to Angular addressing this issue and hopefully it'll be fixed soon.
                    // https://github.com/angular/angular.js/pull/4833
                    if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) {
                        return;
                    }

                    var key = e.keyCode,
                        isModifier = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey,
                        shouldAdd, shouldRemove, shouldBlock;

                    if (isModifier || hotkeys.indexOf(key) === -1) {
                        return;
                    }

                    shouldAdd = !options.addFromAutocompleteOnly && addKeys[key];
                    shouldRemove = !shouldAdd && key === KEYS.backspace && scope.newTag.text.length === 0;
                    shouldBlock = options.addFromAutocompleteOnly && scope.newTag.invalid && addKeys[key];

                    if (shouldAdd) {
                        tagList.addText(scope.newTag.text);

                        scope.$apply();
                        e.preventDefault();
                    }
                    else if (shouldRemove) {
                        var tag = tagList.removeLast();
                        if (tag && options.enableEditingLastTag) {
                            scope.newTag.text = tag[options.displayProperty];
                        }

                        scope.$apply();
                        e.preventDefault();
                    }
                    else if (shouldBlock) {
                      scope.newTag.text = 'Invalid Entry...';
                      scope.newTag.readonly = true;
                      scope.$apply();
                      $timeout(function(){
                        scope.newTag.text = '';
                        scope.newTag.readonly = false;
                      },2000);
                    }
                })
                .on('focus', function() {
                    if (scope.hasFocus) {
                        return;
                    }
                    scope.hasFocus = true;
                    events.trigger('input-focus');

                    scope.$apply();
                })
                .on('blur', function() {
                    $timeout(function() {
                        var activeElement = $document.prop('activeElement'),
                            lostFocusToBrowserWindow = activeElement === input[0],
                            lostFocusToChildElement = element[0].contains(activeElement);

                        if (lostFocusToBrowserWindow || !lostFocusToChildElement) {
                            scope.hasFocus = false;
                            events.trigger('input-blur');
                        }
                    });
                });

            element.find('div').on('click', function() {
                input[0].focus();
            });
            
            // //add the button for showAll
            // if (scope.options[showAll]){
              // var showBtn = angular.element('<span class="input-group-addon"><span class="ui-button-icon-primary ui-icon ui-icon-triangle-1-s"><span class="ui-button-text" style="padding: 0px;">&nbsp;</span></span></span>');
              // showBtn.insertAfter(element);
              // $compile(showBtn)(scope);
            // }
        }
      }
    };
}]);

/**
 * @ngdoc directive
 * @name autoComplete
 * @module ngTagsInput
 *
 * @description
 * Provides autocomplete support for the tagsInput directive.
 *
 * @param {expression} source Expression to evaluate upon changing the input content. The input value is available as
 *                            $query. The result of the expression must be a promise that eventually resolves to an
 *                            array of strings.
 * @param {number=} [debounceDelay=100] Amount of time, in milliseconds, to wait before evaluating the expression in
 *                                      the source option after the last keystroke.
 * @param {number=} [minLength=3] Minimum number of characters that must be entered before evaluating the expression
 *                                 in the source option.
 * @param {boolean=} [highlightMatchedText=true] Flag indicating that the matched text will be highlighted in the
 *                                               suggestions list.
 * @param {number=} [maxResultsToShow=10] Maximum number of results to be displayed at a time.
 */
tagsInput.directive('autoComplete', ["$document","$timeout","$sce","tagsInputConfig","$q","grep", function($document, $timeout, $sce, tagsInputConfig, $q, grep) {
    function getMatches(options){
      return function($query){
        
        var term = $query.$query,
          containsMatcher = new RegExp(term, "i"),
          deferred = $q.defer(),
          matched = grep( options, function(value){
            return containsMatcher.test(value.text);
          });
          matched.sort(function(a,b){
            if (a.text.indexOf(term) === 0 || b.text.indexOf(term) == 0){
              return a.text.indexOf(term) - b.text.indexOf(term);
            }
            return 0;
          });
          deferred.resolve(matched);
          return deferred.promise;
      };
    };

    function SuggestionList(loadFn, options) {
        var self = {}, debouncedLoadId, getDifference, getMatches, lastPromise;

        getDifference = function(array1, array2) {
            return array1.filter(function(item) {
                return !findInObjectArray(array2, item, options.tagsInput.displayProperty);
            });
        };

        self.reset = function() {
            lastPromise = null;

            self.items = [];
            self.visible = false;
            self.index = -1;
            self.selected = null;
            self.query = null;

            $timeout.cancel(debouncedLoadId);
        };
        self.show = function() {
            self.selected = null;
            self.visible = true;
            self.select(0);
        };
        self.load = function(query, tags) {
            if (query.length < options.minLength) {
                self.reset();
                return;
            }

            $timeout.cancel(debouncedLoadId);
            debouncedLoadId = $timeout(function() {
                self.query = query;

                var promise = loadFn({ $query: query });
                lastPromise = promise;

                promise.then(function(items) {
                    if (promise !== lastPromise) {
                        return;
                    }

                    items = makeObjectArray(items.data || items, options.tagsInput.displayProperty);
                    items = getDifference(items, tags);
                    self.items = items.slice(0, options.maxResultsToShow);

                    if (self.items.length > 0) {
                        self.show();
                    }
                    else {
                        self.reset();
                    }
                });
            }, options.debounceDelay, false);
        };
        self.selectNext = function() {
            self.select(++self.index);
        };
        self.selectPrior = function() {
            self.select(--self.index);
        };
        self.select = function(index) {
            if (index < 0) {
                index = self.items.length - 1;
            }
            else if (index >= self.items.length) {
                index = 0;
            }
            self.index = index;
            self.selected = self.items[index];
        };

        self.reset();

        return self;
    }

    function encodeHTML(value) {
        return value.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
    }

    return {
        restrict: 'E',
        require: '^tagsInput',
        templateUrl: 'ngTagsInput/auto-complete.html',
        scope: true,
        link: function(scope, element, attrs, tagsInputCtrl) {
            var hotkeys = [KEYS.enter, KEYS.tab, KEYS.escape, KEYS.up, KEYS.down, KEYS.dot, KEYS.period, KEYS.space, KEYS.comma],
                suggestionList, tagsInput, options, getItemText, documentClick, sourceFunc;

            tagsInputConfig.load('autoComplete', scope, attrs, {
                debounceDelay: [Number, 100],
                minSearchLength: [Number, 3],
                highlightMatchedText: [Boolean, true],
                maxResultsToShow: [Number, 10]
            });

            options = scope.options;
            
            var toggleSuggestionList = function(){
              if (suggestionList.visible){
                suggestionList.reset();
              }
              else{
                suggestionList.load(scope.newTag.text, tagsInput.getTags());
              }
            };

            tagsInput = tagsInputCtrl.registerAutocomplete(toggleSuggestionList);
            options.tagsInput = tagsInput.getOptions();
            
            if ( typeof(scope.source) == "function"){
              sourceFunc = scope.source;
            }
            else{
              sourceFunc = getMatches(scope.source); 
            };

            suggestionList = new SuggestionList(sourceFunc, options);

            getItemText = function(item) {
                return item[options.tagsInput.displayProperty];
            };

            scope.suggestionList = suggestionList;

            scope.addSuggestion = function() {
                var added = false;
                
                if ( scope.tags.length >= scope.options.tagsInput.maxTags ){
                  scope.tags.pop();
                }

                if (suggestionList.selected) {
                    tagsInput.addTag(suggestionList.selected);
                    suggestionList.reset();
                    tagsInput.focusInput();

                    added = true;
                }
                return added;
            };

            scope.highlight = function(item) {
                var text = getItemText(item);
                text = encodeHTML(text);
                if (options.highlightMatchedText) {
                    text = replaceAll(text, encodeHTML(suggestionList.query), '<em>$&</em>');
                }
                return $sce.trustAsHtml(text);
            };

            scope.track = function(item) {
                return getItemText(item);
            };
            
            tagsInput
                .on('tag-added invalid-tag', function() {
                    suggestionList.reset();
                })
                .on('input-change', function(value) {
                    if (value) {
                        suggestionList.load(value, tagsInput.getTags());
                    } else {
                        suggestionList.reset();
                    }
                })
                .on('input-keydown', function(e) {
                    var key, handled;

                    if (hotkeys.indexOf(e.keyCode) === -1) {
                        return;
                    }

                    // This hack is needed because jqLite doesn't implement stopImmediatePropagation properly.
                    // I've sent a PR to Angular addressing this issue and hopefully it'll be fixed soon.
                    // https://github.com/angular/angular.js/pull/4833
                    var immediatePropagationStopped = false;
                    e.stopImmediatePropagation = function() {
                        immediatePropagationStopped = true;
                        e.stopPropagation();
                    };
                    e.isImmediatePropagationStopped = function() {
                        return immediatePropagationStopped;
                    };

                    if (suggestionList.visible) {
                        key = e.keyCode;
                        handled = false;

                        if (key === KEYS.down) {
                            suggestionList.selectNext();
                            handled = true;
                        }
                        else if (key === KEYS.up) {
                            suggestionList.selectPrior();
                            handled = true;
                        }
                        else if (key === KEYS.escape) {
                            suggestionList.reset();
                            handled = true;
                        }
                        else if ( scope.addKeys[key] ) {
                            handled = scope.addSuggestion();
                        }

                        if (handled) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            scope.$apply();
                        }
                    }
                })
                .on('input-blur', function() {
                    suggestionList.reset();
                });

            documentClick = function() {
                if (suggestionList.visible) {
                    suggestionList.reset();
                    scope.$apply();
                }
            };

            $document.on('click', documentClick);

            scope.$on('$destroy', function() {
                $document.off('click', documentClick);
            });
        }
    };
}])
.factory('grep',function(){
  //Copied from jquery.grep
  return function( elems, callback, invert ) {
    var callbackInverse,
      matches = [],
      i = 0,
      length = elems.length,
      callbackExpect = !invert;

    // Go through the array, only saving the items
    // that pass the validator function
    for ( ; i < length; i++ ) {
      callbackInverse = !callback( elems[ i ], i );
      if ( callbackInverse !== callbackExpect ) {
        matches.push( elems[ i ] );
      }
    };
    return matches;
  };
});

/**
 * @ngdoc directive
 * @name tiTranscludeAppend
 * @module ngTagsInput
 *
 * @description
 * Re-creates the old behavior of ng-transclude. Used internally by tagsInput directive.
 */
tagsInput.directive('tiTranscludePrepend', function() {
    return function(scope, element, attrs, ctrl, transcludeFn) {
        transcludeFn(function(clone) {
            element.prepend(clone);
        });
    };
});

/**
 * @ngdoc directive
 * @name tiAutosize
 * @module ngTagsInput
 *
 * @description
 * Automatically sets the input's width so its content is always visible. Used internally by tagsInput directive.
 */
tagsInput.directive('tiAutosize', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, ctrl) {
            var THRESHOLD = 3,
                span, resize;

            span = angular.element('<span class="input"></span>');
            span.css('display', 'none')
                .css('visibility', 'hidden')
                .css('width', 'auto')
                .css('white-space', 'pre');

            element.parent().append(span);

            resize = function(originalValue) {
                var value = originalValue, width;

                if (angular.isString(value) && value.length === 0) {
                    value = attrs.placeholder;
                }

                if (value) {
                    span.text(value);
                    span.css('display', '');
                    width = span.prop('offsetWidth');
                    span.css('display', 'none');
                }

                element.css('width', width ? width + THRESHOLD + 'px' : '');

                return originalValue;
            };

            ctrl.$parsers.unshift(resize);
            ctrl.$formatters.unshift(resize);

            attrs.$observe('placeholder', function(value) {
                if (!ctrl.$modelValue) {
                    resize(value);
                }
            });
        }
    };
});

/**
 * @ngdoc service
 * @name tagsInputConfig
 * @module ngTagsInput
 *
 * @description
 * Sets global configuration settings for both tagsInput and autoComplete directives. It's also used internally to parse and
 * initialize options from HTML attributes.
 */
tagsInput.provider('tagsInputConfig', function() {
    var globalDefaults = {}, interpolationStatus = {};

    /**
     * @ngdoc method
     * @name setDefaults
     * @description Sets the default configuration option for a directive.
     * @methodOf tagsInputConfig
     *
     * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'autoComplete'.
     * @param {object} defaults Object containing options and their values.
     *
     * @returns {object} The service itself for chaining purposes.
     */
    this.setDefaults = function(directive, defaults) {
        globalDefaults[directive] = defaults;
        return this;
    };

    /***
     * @ngdoc method
     * @name setActiveInterpolation
     * @description Sets active interpolation for a set of options.
     * @methodOf tagsInputConfig
     *
     * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'autoComplete'.
     * @param {object} options Object containing which options should have interpolation turned on at all times.
     *
     * @returns {object} The service itself for chaining purposes.
     */
    this.setActiveInterpolation = function(directive, options) {
        interpolationStatus[directive] = options;
        return this;
    };

    this.$get = ["$interpolate", function($interpolate) {
        var converters = {};
        converters[String] = function(value) { return value; };
        converters[Number] = function(value) { return parseInt(value, 10); };
        converters[Boolean] = function(value) { return value.toLowerCase() === 'true'; };
        converters[RegExp] = function(value) { return new RegExp(value); };

        return {
            load: function(directive, scope, attrs, options) {
                scope.options = {};

                angular.forEach(options, function(value, key) {
                    var type, localDefault, converter, getDefault, updateValue;

                    type = value[0];
                    localDefault = value[1];
                    converter = converters[type];

                    getDefault = function() {
                        var globalValue = globalDefaults[directive] && globalDefaults[directive][key];
                        return angular.isDefined(globalValue) ? globalValue : localDefault;
                    };

                    updateValue = function(value) {
                        scope.options[key] = value ? converter(value) : getDefault();
                    };

                    if (interpolationStatus[directive] && interpolationStatus[directive][key]) {
                        attrs.$observe(key, function(value) {
                            updateValue(value);
                        });
                    }
                    else {
                        updateValue(attrs[key] && $interpolate(attrs[key])(scope.$parent));
                    }
                });
            }
        };
    }];
});


/* HTML templates */
tagsInput.run(["$templateCache", function($templateCache) {
    $templateCache.put('ngTagsInput/tags-input.html',
    "<div class=\"host\" ng-class=\"{'input-group': options.showAll && source}\" tabindex=\"-1\" ti-transclude-prepend=\"\"><div class=\"tags\" ng-class=\"{focused: hasFocus}\"><ul class=\"tag-list\"><li class=\"tag-item\" ng-repeat=\"tag in tagList.items track by $id(tag)\" ng-class=\"{ selected: tag == tagList.selected }\"><span>{{getDisplayText(tag)}}</span> <a class=\"remove-button\" ng-click=\"tagList.remove($index)\">{{options.removeTagSymbol}}</a></li></ul><input class=\"input\" placeholder=\"{{options.placeholder}}\" tabindex=\"{{options.tabindex}}\" ng-model=\"newTag.text\" ng-readonly=\"newTag.readonly\" ng-change=\"newTagChange()\" ng-trim=\"false\" ng-class=\"{'invalid-tag': newTag.invalid}\" ti-autosize=\"\"></div><auto-complete ng-if=\"source\" debounce-delay=\"{{options.debounceDelay}}\" min-search-length=\"{{options.minSearchLength}}\" highlight-matched-text=\"{{options.highlightMatchedText}}\" maxresults-to-show=\"{{options.maxResultsToShow}}\"></auto-complete><span class=\"input-group-addon\" ng-if=\"options.showAll && source\" ng-click=\"toggleSuggestionList();\"><span class=\"ui-button-icon-primary ui-icon ui-icon-triangle-1-s\"><span class=\"ui-button-text\" style=\"padding: 0px\">&nbsp;</span></span></span></div>"
  );

  $templateCache.put('ngTagsInput/auto-complete.html',
    "<div class=\"autocomplete\" ng-show=\"suggestionList.visible\"><ul class=\"suggestion-list\"><li class=\"suggestion-item\" ng-repeat=\"item in suggestionList.items track by $id(item)\" ng-class=\"{selected: item == suggestionList.selected}\" ng-click=\"addSuggestion()\" ng-mouseenter=\"suggestionList.select($index)\" ng-bind-html=\"highlight(item)\"></li></ul></div>"
  );
}]);

}());