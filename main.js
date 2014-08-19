/**
 * EditorConfig for Brackets Copyright (c) 2014 Chen-Heng Chang.
 *
 * Licensed under MIT
 *
 * Based on https://github.com/MiguelCastillo/Brackets-wsSanitizer
 */


define(function (require, exports, module) {
    'use strict';

    var CommandManager     = brackets.getModule('command/CommandManager'),
        Commands           = brackets.getModule('command/Commands'),
        DocumentManager    = brackets.getModule('document/DocumentManager'),
        Editor             = brackets.getModule('editor/Editor').Editor,
        Menus              = brackets.getModule('command/Menus'),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
        AppInit            = brackets.getModule("utils/AppInit"),
        LanguageManager    = brackets.getModule("language/LanguageManager"),
        ExtensionUtils     = brackets.getModule("utils/ExtensionUtils"),
        NodeDomain         = brackets.getModule("utils/NodeDomain"),
        PREFERENCES_KEY    = 'brackets-editorconfig',
        prefs              = PreferencesManager.getExtensionPrefs(PREFERENCES_KEY);

        var _prefLocation = {
            location: {
                scope: "session"
            }
        };
        var configDomain = new NodeDomain("editorconfig", ExtensionUtils.getModulePath(module, "node/domain"));
        var trim_trailing_whitespace = false;
        var insert_final_newline = false;

    LanguageManager.defineLanguage("editorconfig", {
        name: "EditorConfig",
        mode: "properties",
        fileNames: [".editorconfig"]
    });

    // Set default value
    prefs.definePreference("enabled", "boolean", "true");

    // Set up the menu and callback for it
    (function() {
        var COMMAND_ID = PREFERENCES_KEY,
            menu       = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU),
            command    = CommandManager.register('EditorConfig', COMMAND_ID, setEnabled);

        menu.addMenuDivider();
        menu.addMenuItem(COMMAND_ID);
        menu.addMenuDivider();

        function setEnabled() {
            var enabled = !command.getChecked();
            command.setChecked(enabled);
            prefs.set('enabled', enabled);
            $(DocumentManager)[enabled ? 'on' : 'off']('documentSaved', sanitize);
            $(DocumentManager)[enabled ? 'on' : 'off']("currentDocumentChange", apply);
            if (enabled) apply();
        }

        command.setChecked(!prefs.get('enabled'));
        setEnabled();
    })();


    function sanitize(event, doc) {
        doc.batchOperation(function () {
            var line, pattern, match;
            var lineIndex = 0,
                wsPattern = getReplacePattern(Editor);

            //trim trailing whitespaces
            while ((line = doc.getLine(lineIndex)) !== undefined) {
                pattern = /[ \t]+$/g;
                match = pattern.exec(line);
                if (trim_trailing_whitespace && match) {
                    doc.replaceRange(
                        '',
                        {line: lineIndex, ch: match.index},
                        {line: lineIndex, ch: pattern.lastIndex}
                    );
                }
/*
                match = wsPattern.sanitizeLine(line);
                if ( match.replaceWith ) {
                    doc.replaceRange(
                        match.replaceWith,
                        {line: lineIndex, ch: match.start},
                        {line: lineIndex, ch: match.end}
                    );
                }
*/
                lineIndex += 1;
            }

            //ensure newline at the end of file
            line = doc.getLine(lineIndex - 1);
            if (insert_final_newline && line !== undefined && line.length > 0 && line.slice(-1) !== '\n') {
                doc.replaceRange(
                    '\n',
                    {line: lineIndex, ch: line.slice(-1)}
                );
            }
        });

        CommandManager.execute(Commands.FILE_SAVE, {doc: doc});
    }


    function getReplacePattern(editor) {
        var pattern = editor.getUseTabChar() ? {
            units: editor.getTabSize(),
            matchPattern: /^[ ]+/g,
            replaceWith: '\t',
            getIndent: function(length) {
                return Math.round(length / pattern.units);
            }
        }: {
            units: editor.getSpaceUnits(),
            matchPattern: /^[\t]+/g,
            replaceWith: ' ',
            getIndent: function(length) {
                return length * pattern.units;
            }
        };


        function sanitizeLine(line) {
            var regMatch = line.match(pattern.matchPattern);
            var matches  = (regMatch || [''])[0];
            var indent   = pattern.getIndent(matches.length);

            return {
                replaceWith: new Array(indent + 1).join(pattern.replaceWith),
                start: 0,
                end: matches.length
            };
        }

        return {
            sanitizeLine: sanitizeLine
        };
    }

    function apply() {
        if (DocumentManager.getCurrentDocument())
        configDomain.exec("parse", DocumentManager.getCurrentDocument().file.fullPath)
            .done(function (config) {
                if (JSON.stringify(config) !== "{}") {
                    PreferencesManager.set("useTabChar", (config.indent_style === 'tab' ) ? true : false, _prefLocation);
                    if (config.indent_style === 'tab' && config.indent_size) {
                        PreferencesManager.set("tabSize", config.indent_size, _prefLocation);
                    }
                    if (config.indent_style === 'space' && config.indent_size) {
                        PreferencesManager.set("spaceUnits", config.indent_size, _prefLocation);
                    }
                    trim_trailing_whitespace = config.trim_trailing_whitespace ? true : false;
                    insert_final_newline = config.insert_final_newline ? true : false;
                }
            }).fail(function (err) {
                console.error("[brackets-editorconfig] failed to parse configuration", err);
            });
    }
});
