var SVN = require ('./svn.js');
var _ = require('underscore');
var Router = require('./router.js');
var LogList = require('./widget/logList.js');
var Browse = require('./widget/browse.js');
var ChangeList = require('./widget/changeList.js');
var DiffViewer = require('./widget/diffViewer.js');
var Navigation = require('./widget/navigation.js');
var StatusBar = require('./widget/statusBar.js');
var Toolbar = require('./widget/toolbar.js');
var Settings = require('./widget/settings.js');
var SettingsProvider = require('./settingsProvider.js');
var Popup = require('./widget/popup.js');
var pathUtil = require('path');
var fs = require('fs');
var win = gui.Window.get();

require('date-utils');

var App = function () {
    global.App = this;

    var _this = this, refreshInterval;


    this.router = new Router(this);

    this.createAppView();

    function updateSyncState () {
        _this.svn.isUpToDate(function (upToDate) {
            _this.toolbar.setSyncState(upToDate);
        });
    }

    _this.svn = new SVN(SettingsProvider.getValue("repo"), function (err, info) {
        _this.statusbar = _this.createStatusbar(_this.svn);
        _this.wrapper.append(_this.statusbar.domNode);
        updateSyncState();
    });

    refreshInterval = SettingsProvider.getValue("syncRefreshInterval");
    refreshInterval = refreshInterval ? parseInt(refreshInterval, 10) * 1000 : 60000;

    // Update the sync button periodically to see if we are up to date
    setInterval(updateSyncState, refreshInterval);

    this.toolbar.on("svnUpdate", function () {
        _this.toolbar.setUpdateButtonLoading(true);
        _this.svn.update(function(err, info) {
            _this.toolbar.setUpdateButtonLoading(false);
            _this.toolbar.setSyncState(!err);
        });
    });
};


App.prototype.createAppView = function () {
    var _this = this, wrapper, nav, center, centerWrapper, toolbar, refreshInterval;

    wrapper = this.wrapper = this.createWrapper();
    nav = this.nav = this.createNavigation();
    center = this.center = this.createCenter();
    toolbar = this.toolbar = this.createToolbar();

    wrapper.append(toolbar.domNode);
    center.append(nav.domNode);
    wrapper.append(center);

    center.addClass("flex-item");
    toolbar.domNode.addClass("flex-item fixed");
    nav.domNode.addClass("flex-item fixed");

    $(window.document.body).append(this.wrapper);
};

App.prototype.createWrapper = function () {
    return $('<div class="flex column" style="width: 100%; height: 100%;">');
};

App.prototype.createNavigation = function () {
    var nav = new Navigation(),
        _this = this;
    nav.on('navigate', function (pageName) {
        _this.handleNavigate(pageName);
    });
    return nav;
};

App.prototype.createCenter = function () {
    return $('<div class="flex row">');
};

App.prototype.createToolbar = function () {
    return new Toolbar();
};

App.prototype.createStatusbar = function (svn) {
    return new StatusBar(svn);
};

App.prototype.showMenu = function () {
    this.nav.domNode.show();
};

App.prototype.hideMenu = function () {
    this.nav.domNode.hide();
};

App.prototype.removeScreen = function () {
    if (this.currentScreen) {
         this.currentScreen.domNode.detach();
        delete this.currentScreen;
    }
};

App.prototype.showScreen = function (newScreen) {
    this.removeScreen();
    this.currentScreen = newScreen;
    this.center.append(newScreen.domNode);
};

App.prototype.showLoading = function (loading) {
    if (loading) {
        this.center.addClass("loading");
    } else {
        this.center.removeClass("loading");
    }
};

App.prototype.showSettings = function () {
    var _this = this;

    if (!_this.settings) {
        _this.settings = new Settings(_this.svn);
    }

    this.showScreen(_this.settings);
};

App.prototype.showChanges = function () {
    var _this = this;

    if (!_this.changeList) {
        _this.changeList = new ChangeList(_this.svn);
    }

    this.showScreen(_this.changeList);
};

App.prototype.showBrowse = function () {
    var _this = this;

    if (!_this.browse) {
        _this.browse = new Browse(_this.svn);
    }

    this.showScreen(_this.browse);
};

App.prototype.showHistory = function (path) {
    var _this = this;

    // if (!_this.logList) {
        _this.logList = new LogList(_this.svn, path);
    // }

    this.showScreen(_this.logList);
};

App.prototype.showDiffLocal = function (path) {
    this.showDiffExternal(path);
};

App.prototype.showDiffExternal = function (path, revision) {
    var _this = this;
    _this.removeScreen();
    _this.showLoading(true);
    _this.svn.getFile(path.trim(), revision, function (err, text1) {
        _this.svn.getFile(path.trim(), revision ? revision - 1 : "BASE", function (err, text2) {
            var diffViewer = new DiffViewer();
            _this.showScreen(diffViewer);
            diffViewer.show(pathUtil.extname(path).substr(1), text2, text1);
            _this.showLoading(false);
        });
    });
};

module.exports = function () {
    return new App();
};