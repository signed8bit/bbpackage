var _ = require('underscore'),
    Q = require('q'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    fs = require('fs'),
    glob = require('glob'),
    moment = require('moment'),
    shell = require('shelljs'),
    request = require('request'),
    unzip = require('unzip'),
    BBRequest;

/**
 * @class BBRequest
 */
BBRequest = function() {
    this.init.apply(this, arguments);
};

_.extend(BBRequest.prototype, /** @lends BBRequest.prototype */ {

    /**
     * @public
     * @constructo
     */
    'init': function() {
    },

    /**
     * @public
     */
    'get': function(endpoint, data) {
        var d = Q.defer();

        var result;

        switch (endpoint) {
            case 'search':
                result = [
                    {
                        'name': 'jshint',
                        'description': 'A JavaScript code quality tool - helps detect errors and potential problems in code.',
                        'url': 'https://github.com/tkambler/bbedit-jshint'
                    }
                ];
            break;
            case 'package_info':
                result = {
                    'name': 'jshint',
                    'description': 'A JavaScript code quality tool - helps detect errors and potential problems in code.',
                    'url': 'https://github.com/tkambler/bbedit-jshint',
                    'download_url': 'https://github.com/tkambler/bbedit-jslint/zipball/master/'
                };
            break;
        }

        d.resolve(result);
        return d.promise;
    },

    /**
     * @public
     */
    'download': function(source_url) {
        var d = Q.defer(),
            target = path.resolve(shell.tempdir()) + '/' + moment().unix() + '.zip',
            unzip_target = path.resolve(shell.tempdir()) + '/' + moment().unix(),
            file = fs.createWriteStream(target),
            parsed = url.parse(source_url),
            req;
        parsed.rejectUnauthorized = false;
        this._getFile(parsed, target, function(err) {
            if (err) {
                return d.reject(err);
            }
            fs.createReadStream(target).pipe(unzip.Extract({
                'path': unzip_target
            })).on('close', function() {
                var files = glob.sync(unzip_target + '/**/*.bbpackage');
                if (files.length !== 1) {
                    return d.reject('Unable to locate .bbpackage folder');
                } else {
                    d.resolve(files[0]);
                }
            });
        });
        return d.promise;
    },

    /**
     * @private
     */
    '_getFile': function(parsed, path, cb) {
        var http_or_https = http,
            self = this;
        if (_.isString(parsed)) {
            parsed = url.parse(parsed);
            parsed.rejectUnauthorized = false;
        }
        if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(parsed.href)) {
            http_or_https = https;
        }
        http_or_https.get(parsed, function(response) {
            var headers = JSON.stringify(response.headers);
            switch(response.statusCode) {
                case 200:
                    var file = fs.createWriteStream(path);
                    response.on('data', function(chunk){
                        file.write(chunk);
                    }).on('end', function(){
                        file.end();
                        cb(null);
                    });
                    break;
                case 301:
                case 302:
                case 303:
                case 307:
                    self._getFile(response.headers.location, path, cb);
                    break;
                default:
                    cb(new Error('Server responded with status code ' + response.statusCode));
            }

        })
        .on('error', function(err) {
            cb(err);
        });
    }

});

module.exports = BBRequest;
