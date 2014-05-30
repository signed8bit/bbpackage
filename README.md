bbpackage
=========

A package manager for BBEdit.

## What is BBEdit?

>BBEdit is the leading professional HTML and text editor for the Macintosh. Specifically crafted in response to the needs of Web authors and software developers, this award-winning product provides an abundance of high-performance features for editing, searching, and manipulation of text. An intelligent interface provides easy access to BBEdit’s best-of-class features, including grep pattern matching, search and replace across multiple files, project definition tools, function navigation and syntax coloring for numerous source code languages, code folding, FTP and SFTP open and save, AppleScript, Mac OS X Unix scripting support, text and code completion, and of course a complete set of robust HTML markup tools.

[http://www.barebones.com/products/bbedit/](http://www.barebones.com/products/bbedit/)

## What is bbpackage?

BBEdit is a fantastic text editor for OS X. It's rock-solid, well-designed, and its project-wide search functionality is one of the best implementations I've come across. I much prefer it to alternative editors such as [Sublime](http://www.sublimetext.com/) or [Chocolat](https://chocolatapp.com/).

Unfortunately, BBEdit lags behind other editors when it comes to available plugins. BBEdit provides support for creating and sharing "packages," but no centralized mechanism by which these packages can easily be found and installed has existed... until now.

## Installing BBPackage

### Prerequisites

* [Node.js](http://nodejs.org/)

```
$ sudo npm install -g bbpackage
```

That's it. You're done.

## Searching for Packages

```
$ bbpackage search jshint
```

## Installing a Package

```
$ bbpackage install jshint
```

## Uninstalling a Package

```
$ bbpackage uninstall jshint
```

## Registering a Package

The `bbpackage` utility works similarly to [Bower](http://bower.io/), if you're familiar with that. Packages are registered on a first-come, first-serve basis, and must be available on GitHub. The following example illustrates how you would go about registering a new package:

```
$ bbpackage register jshint https://github.com/tkambler/bbedit-jshint
```

## Package Format

To understand how to go about creating your own packages, it would be best to look at an actual example:

[jshint](https://github.com/tkambler/bbedit-jshint)

The [BBEdit documentation](http://pine.barebones.com/manual/BBEdit_10_User_Manual.pdf) defines a format that packages should follow (see the "Language Modules and Packages" chapter), and that is exactly what bbpackage expects, with one optional addition:

If you are familiar with Node.js and prefer to write your packages within that framework (like I do), within your package's `Contents` folder, you can create a `package.json` file. If this file exists, bbpackage will automatically install any defined dependencies when your package is installed.

## Discuss

This project is in its infancy. If you'd like to discuss, join the #bbpackage channel on Freenode.