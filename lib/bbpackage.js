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
                'action': function(name) {
                    self._install(name);
                }
            },
            {
                'value': 'uninstall',
                'description': 'Remove a local package',
                'action': function(name) {
                    self._uninstall(name);
                }
            },
            {
                'value': 'register',
                'description': 'Register a package: $ bbpackage register jshint https://github.com/tkambler/bbedit-jshint',
                'action': function(name, url) {
                    if (!name || !_.isString(name)) {
                        self._err('Error: `name` is required.');
                    }
                    if (!url || !_.isString(url)) {
                        self._err('Error: `url` is required.');
                    }
                    self._register(name, url);
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
        this._req.get('api/search', {
            'query': search_term
        }).then(function(results) {
            var tpl = self._getTemplate('search_results');
            if (_.isEmpty(results)) {
                return self._done('No results were found for: `' + search_term + '`');
            }
            self._done(tpl({
                'results': results
            }));
        }).catch(function(err) {
            self._err('Error: ' + err);
        });
    },

    /**
     * @private
     */
    '_install': function(name) {
        var self = this;
        this._req.get('api/package_info', {
            'name': name
        }).then(function(info) {
            if (!info) {
                return self._done('The package `' + name + '` does not exist.');
            }
            self._req.download(info.download_url).then(function(source) {
                self._installPackage(source);
            }).catch(function(err) {
                self._err('Error: ' + err);
            });
        }).catch(function(err) {
            self._err('Error: ' + err);
        });
    },

    /**
     * @private
     */
    '_uninstall': function(name) {
        var self = this;
        if (!_.isString(name)) {
            self._err('Error: Invalid package name specified');
        }
        name = name.toLowerCase();
        var target = this._getSupportFolder() + '/Packages/' + name + '.bbpackage';
        if (!fs.existsSync(target)) {
            self._err('Error: Package `' + name + '` is not installed.');
        }
        this._delFolderRecursive(target);
        self._done('Package `' + name + '` was uninstalled. You should restart BBEdit.');
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
        var self = this;
        var basename = path.basename(source);
        var target = this._getSupportFolder() + '/Packages/' + basename;
        if (fs.existsSync(target)) {
            self._err('Error: A package named `' + basename + '` is already installed.');
        }
        fs.renameSync(source, target);
        this._installPackageModules(target, function(err, result) {
            self._done('Package `' + basename + '` installed. You should restart BBEdit.');
        });
    },

    /**
     * @private
     */
    '_installPackageModules': function(target, cb) {
        var packageDir = target + '/Contents',
            packagePath = packageDir + '/package.json';
        if (!fs.existsSync(packagePath)) {
            return cb();
        }
        var cmd = _.sprintf('cd %s; npm install', packageDir.replace('Application', 'Application\\'));
        shell.exec(cmd, {
            'silent': true,
            'async': true
        }, function() {
            cb();
        });
    },

    /**
     * @private
     */
    '_delFolderRecursive': function(path) {
        if (!path) {
            throw 'No value for `path` specified.';
        }
        var files = [],
            self = this;
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path);
            files.forEach(function(file,index){
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    self._delFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    },

    /**
     * @private
     */
    '_register': function(name, url) {
        var self = this;
        this._req.post('api/register', {
            'name': name,
            'url': url
        }).then(function(result) {
            switch (result.status) {
                case 'added':
                    self._done('The package was registered. It can now be installed with: $ bbpackage install ' + name);
                break;
                case 'exists':
                    self._done('Error: A package with the name `' + name + '` has already been registered.');
                break;
            }
        }).catch(function(err) {
            self._err('An unknown error occurred when attempting to register the package.');
        });
    },

    /**
     * @private
     */
    '_done': function(msg) {
        console.log(msg);
        process.exit(0);
    },

    /**
     * @private
     */
    '_err': function(msg) {
        console.log(msg);
        process.exit(1);
    }

});

module.exports = BBPackage;
