var _ = require('underscore'),
    _str = require('underscore.string'),
    fs = require('fs'),
    path = require('path'),
    commander = require('commander'),
    Q = require('q'),
    plist = require('simple-plist'),
    shell = require('shelljs'),
    BBRequest = require('./bbrequest'),
    Handlebars = require('handlebars'),
    BBPackage;

_.mixin(_str);

/**
 * @class BBPackage
 */
BBPackage = function() {
    this.init.apply(this, arguments);
};

_.extend(BBPackage.prototype, /** @lends BBPackage.prototype */ {

    /**
     * @public
     * @constructor
     */
    'init': function() {
        this._loadPackage();
        this._initRequest();
        this._initCommands();
    },

    /**
     * @private
     */
    '_initCommands': function() {
        var self = this;
        var commands = [
            {
                'value': 'search',
                'description': 'Search for a package by name',
                'action': function(search_term) {
                    self._search(search_term);
                }
            },
            {
                'value': 'install',
                'description': 'Install a package locally',
                'action': function() {
                    self._install();
                }
            },
            {
                'value': 'uninstall',
                'description': 'Remove a local package',
                'action': function() {
                    self._uninstall();
                }
            },
            {
                'value': 'register',
                'description': 'Register a package',
                'action': function() {
                    self._install();
                }
            }
        ];
        commander.version(this._package.version);
        commander.description(this._package.description);
        _.each(commands, function(command) {
            commander.command(command.value).description(command.description).action(command.action);
        });
        commander.parse(process.argv);
    },

    /**
     * @private
     */
    '_loadPackage': function() {
        var contents = fs.readFileSync(__dirname + '/../package.json', 'utf8');
        this._package = JSON.parse(contents);
    },

    /**
     * @private
     */
    '_initRequest': function() {
        this._req = new BBRequest();
    },

    /**
     * @private
     */
    '_search': function(search_term) {
        var self = this;
        this._req.get('search', {
            'query': search_term
        }).then(function(results) {
            var tpl = self._getTemplate('search_results');
            console.log(tpl({
                'results': results
            }));
        }).catch(function(err) {
            console.log('Error: ' + err);
        });
    },

    /**
     * @private
     */
    '_install': function(name) {
        var self = this;
        this._req.get('package_info', {
            'name': name
        }).then(function(info) {
            self._req.download(info.download_url).then(function(source) {
                self._installPackage(source);
            }).catch(function(err) {
                console.log('Error: ' + err);
            });
        }).catch(function(err) {
            console.log('Error: ' + err);
        });
    },

    /**
     * @private
     */
    '_getTemplate': function(name) {
        var contents = fs.readFileSync(__dirname + '/../templates/' + name + '.hbs', 'utf8');
        return Handlebars.compile(contents);
    },

    /**
     * @private
     */
    '_getPrefs': function() {
        var username = this._getUsername();
        var file = '/Users/' + username + '/Library/Preferences/com.barebones.bbedit.plist';
        var obj = plist.readFileSync(file);
        console.log(JSON.stringify(obj));
    },

    /**
     * @private
     */
    '_getUsername': function() {
        var username = shell.exec('whoami', {
            'silent': true
        });
        username = username.output.trim();
        if (!username) {
            throw 'Unable to determine username.';
        }
        return username;
    },

    /**
     * @private
     */
    '_getSupportFolder': function() {
        return _.sprintf('/Users/%s/Library/Application\ Support/BBEdit', this._getUsername());
    },

    /**
     * @private
     */
    '_installPackage': function(source) {
        var basename = path.basename(source);
        var target = this._getSupportFolder() + '/Packages/' + basename;
        fs.renameSync(source, target);
        console.log('done');
    }

});

module.exports = BBPackage;
