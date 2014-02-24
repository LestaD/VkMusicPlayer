var
    Port,
    Songs,
    LastActive,
    LastActiveIndex,
    FirstLoad,
    UpdateList,
    Overlay,
    OverlayTxt,
    Settings,
    CurrentUser,
    AllUsers,
    RightClick = true;

/**
 * Main object
 *
 * @type {object} Object
 */
var Core = {};

Core.audioEvent = function() {
    var songs = document.getElementById('player-wrapper').getElementsByTagName('li');

    for(var i = 0, size = songs.length; i < size; i++) {
        var song = songs[i];

        song.addEventListener('click', Core.event.playSong);
    }
};

Core.play = function(e) {
    if(LastActiveIndex)
        Core.removeActiveIndex(LastActiveIndex);

    if(LastActive)
        LastActive.className = '';

    var element;

    if(e.target.nodeName == 'LI')
        element = e.target;
    else
        element = e.target.parentNode;

    var index = element.getAttribute('data-index');

    element.className = 'active';
    LastActive = element;

//    MFCore.set(Songs[index].url, Songs[index].duration);
};

Core.removeActiveIndex = function(index) {
    var i = index - 1;
    document.getElementById('player-wrapper').getElementsByTagName('li')[i].className = '';
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
Core.setActiveByIndex = function(index) {
    var i = index - 1;
    document.getElementById('player-wrapper').getElementsByTagName('li')[i].className = 'active';
};

/**
 * Set song info into DOM
 *
 * @param {string} artist
 * @param {string} title
 * @param {number} totalTime
 */
Core.setSongInfo = function(artist, title, totalTime) {
    MFTimeAll.textContent = totalTime;
    MFArtist.textContent = artist;
    MFTitle.textContent = title;
};

/**
 * Events
 *
 * @type {object}
 */
Core.event = {};

/**
 * Create connection
 */
Core.event.connect = function() {
    Port = chrome.runtime.connect({name: 'core'});
};

/**
 * Listen for data
 */
Core.event.listenData = function() {
    chrome.runtime.onConnect.addListener(function(bgPort) {
        Core.event.onOpen();
        bgPort.onMessage.addListener(function(msg) {
            console.log(msg);

            if(Core.event.hasOwnProperty(msg.event))
                Core.event[msg.event](msg.data);
        });
    });
};

Core.event.send = function(data) {
    Port.postMessage(data);
};

Core.event.checkFirstLoad = function() {
    Core.event.send({
        event: 'checkFirstLoad',
        data: ''
    });
};

/**
 *  Init this load like first
 *
 * @param {object} data
 */
Core.event.setFirstLoadToTrue = function(data) {
    FirstLoad = data;
};

/**
 * Define that is not first load on this session
 *
 * @param {object} data
 */
Core.event.setFirstLoadToFalse = function(data) {
    FirstLoad = data;
};

/**
 * Play song
 */
Core.event.sendPlay = function() {
    Core.event.send({
        event: 'sendPlay',
        data: null
    });
};

Core.event.playSong = function(e) {
    var element;

    if(e.target.nodeName == 'LI')
        element = e.target;
    else
        element = e.target.parentNode;

    var index = element.getAttribute('data-index');

    MFTimeCurrent.textContent = '0:00';
    MFBuffer.style.width = 0;
    MFProgress.style.width = 0;

    Core.event.send({
        event: 'playByIndex',
        data: index
    });
};

Core.event.play = function(data) {
    MFPlay.addEventListener('click', function() {
        if(FirstLoad) {
            Core.event.sendPlay();
            FirstLoad = false;
        } else {
            if(MFPlay.classList.contains('pause')) {
                Core.event.send({
                    event: 'setToPause',
                    data: ''
                });
            } else {
                Core.event.send({
                    event: 'setToPlay',
                    data: ''
                });
            }
        }
    });
};

Core.event.getSongDuration = function() {
    Core.event.send({
        event: 'getSongDuration',
        data: ''
    });
};

Core.event.setSongDuration = function(data) {
    console.log(data);
    MFDuration = data;
};

Core.event.changeSongInfo = function(data) {
    Core.setSongInfo(data.artist, data.title, data.duration);
    MFDuration = data.realDuration;
};

Core.event.sendSetFirstActive = function(data) {
    Core.setActiveByIndex(1);
};

Core.event.timeUpdate = function(data) {
    MFTimeCurrent.textContent = data;
};

Core.event.changePlayToPause = function(data) {
    if(!MFPlay.classList.contains('pause'))
        MFPlay.className += ' pause';
};

/**
 * Change icon to pause
 *
 * @param data
 */
Core.event.changePauseToPlay = function(data) {
    MFPlay.classList.remove('pause');
};

/**
 * Set width of progress bar element
 *
 * @param {string} data
 */
Core.event.setProgressBarWidth = function(data) {
    MFProgress.style.width = data;
};

/**
 * Set width of load process element
 *
 * @param {string} data
 */
Core.event.setLoadProgress = function(data) {
    MFBuffer.style.width = data;
};

/**
 * Highlight new active song in list
 *
 * @param {{oldIndex: number, newIndex: number}} data
 */
Core.event.setNewHighLightElement = function(data) {
    Core.removeActiveIndex(data.oldIndex);
    Core.setActiveByIndex(data.newIndex);
};

/**
 * Update list of audio
 */
Core.event.updateList = function() {
    Core.setSizeToMain();
    Core.showOverlay();
    Core.hideOpacity('wrapper');
    Core.event.send({
        event: 'updateList',
        data: ''
    });
};

/**
 * Reload popup #wrapper element
 *
 * @param data
 */
Core.event.reloadContent = function(data) {
    document.getElementById('main').removeChild(document.getElementById('wrapper'));
    Core.loadBackgroundContent(true, 'wrapper', function() {
        Core.hideOverlay();
        Core.showOpacity('wrapper');
        Core.removeSizeFromMain();
    });
};

/**
 * Open window for authorization in VK.com
 */
Core.event.authorize = function() {
    Core.event.send({
        event: 'openAuth',
        data: ''
    });
};

/**
 * Send this event when popup will open
 */
Core.event.onOpen = function() {
    Core.event.checkFirstLoad();
    Core.event.getSongDuration();
};

/**
 * Set width and height to #main
 */
Core.setSizeToMain = function() {
    var MainBlock = document.getElementById('main');
    MainBlock.style.width = MainBlock.clientWidth + 'px';
    MainBlock.style.height = MainBlock.clientHeight + 'px';
};

/**
 * Remove style attribute from #main
 */
Core.removeSizeFromMain = function() {
    document.getElementById('main').removeAttribute('style');
};

Core.showOverlay = function() {
    Overlay.style.display = 'block';
    setTimeout(function() {
        OverlayTxt.className += ' show';
    }, 50);
};

Core.hideOverlay = function() {
    OverlayTxt.classList.remove('show');

    setTimeout(function() {
        Overlay.style.display = 'none';
    }, 50);
};

/**
 * Set opacity to 1
 *
 * @param {string} elementID
 */
Core.showOpacity = function(elementID) {
    document.getElementById(elementID).className = 'show-opacity';
};


/**
 * Set opacity to 0
 *
 * @param {string} elementID
 */
Core.hideOpacity = function(elementID) {
    document.getElementById(elementID).className = 'hide-opacity';
};

/**
 * Auth user & get songs from background page
 */
Core.auth = function() {
    Core.loadBackgroundContent();
};

/**
 * Load background page
 *
 * @param {object|boolean} port
 * @param {string} elementID
 * @param {function} callback
 */
Core.loadBackgroundContent = function(port, elementID, callback) {
    chrome.runtime.getBackgroundPage(function(win) {
        var node;

        if(elementID && elementID != '') {
            node = document.importNode(win.document.getElementById(elementID), true);
            document.getElementById('main').insertBefore(node, document.getElementById('app-nav-block'));
        } else {
            node = document.importNode(win.document.getElementById('main'), true);
            document.body.appendChild(node);
        }

        //users
        var users = document.importNode(win.document.getElementById('change-user'), true),
            NavBlock = document.getElementById('app-nav-block');

        NavBlock.removeChild(document.getElementById('change-user'));
        NavBlock.insertBefore(users, document.getElementById('update-list'));

        if(localStorage['authInfo'] != undefined) {
            Core.audioEvent();

            if(win.LastActiveIndex)
                LastActiveIndex = win.LastActiveIndex;

            MFCore.init();
            Core.setElements();
            Core.setEvents();

            if(!port) {
                Core.event.listenData();
                Core.event.connect();
            } else {
                Core.event.onOpen();
            }

            Core.event.play();
        } else {
            var authButton = document.getElementById('vk-auth');
            document.getElementById('app-nav-block').style.display = 'none';

            Core.event.listenData();
            Core.event.connect();

            authButton.addEventListener('click', Core.event.authorize);
        }

        Core.showOpacity('wrapper');

        if(callback)
            callback();
    });
};

Core.openSettings = function() {
    chrome.tabs.create({url: chrome.runtime.getURL('/templates/settings.html')});
};

/**
 * Show all users
 *
 * @param {event} e
 */
Core.openAllUsers = function(e) {
    CurrentUser.getElementsByClassName('user')[0].classList.toggle('active');

    if(AllUsers.classList.contains('opened')) {
        AllUsers.removeAttribute('style');
        AllUsers.className = '';
    } else {
        var arr = ['-', AllUsers.clientHeight - 1, 'px'];
        AllUsers.style.top = arr.join('');
        AllUsers.className = 'opened';
    }
};

/**
 * Choose user playlist
 */
Core.allUsersEvents = function() {
    var users = AllUsers.getElementsByClassName('user'),
        currUser = CurrentUser.getElementsByClassName('user')[0];

    for(var i = 0, size = users.length; i < size; i++) {
        users[i].addEventListener('click', function(e) {
            Core.setSizeToMain();
            Core.showOverlay();
            Core.hideOpacity('wrapper');

            currUser.classList.toggle('active');
            AllUsers.removeAttribute('style');
            AllUsers.className = '';
            CurrentUser.removeChild(currUser);
            CurrentUser.appendChild(this);

            Core.event.send({
                event: 'setActiveUser',
                data: this.getAttribute('data-id')
            });
        });
    }
};

/**
 * Init events
 */
Core.setEvents = function() {
    UpdateList.addEventListener('click', Core.event.updateList);
    Settings.addEventListener('click', Core.openSettings);
    CurrentUser.addEventListener('click', Core.openAllUsers);
    Core.allUsersEvents();
};

/**
 * Init DOM elements
 */
Core.setElements = function() {
    UpdateList = document.getElementById('update-list');
    Overlay = document.getElementById('bg-overlay');
    OverlayTxt = document.getElementById('overlay-txt');
    Settings = document.getElementById('settings');
    CurrentUser = document.getElementById('current-user');
    AllUsers = document.getElementById('all-users');
};


/**
 * Control right click
 */
Core.rightClick = function() {
    document.addEventListener('contextmenu', function(e) {
        if(!RightClick) {
            e.preventDefault();
            return false;
        }
    });
};

/**
 * Init functions
 */
Core.init = function() {
    Core.auth();
    Core.rightClick();
};

window.addEventListener('DOMContentLoaded', Core.init);