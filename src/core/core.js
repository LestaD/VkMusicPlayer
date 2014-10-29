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
    RightClick = true,
    RepeatSong,
    AlbumList,
    AlbumTitle,
    AudioList,
    ShuffleSongs,
    Broadcast,
    isEvents = false,
    isElements = false;

/**
 * Main object
 *
 * @type {object} Object
 */
var Core = {};

Core.audioEvent = function () {
    var songs = document.getElementById('player-wrapper').getElementsByTagName('li');

    for (var i = 0, size = songs.length; i < size; i++) {
        var song = songs[i];
        song.getElementsByTagName('a')[0].addEventListener('click', Core.downloadSong);

        song.addEventListener('click', Core.event.playSong);
    }
};

Core.downloadSong = function (e) {
    e.preventDefault();

    var index = e.target.parentNode.getAttribute('data-index');

    Core.event.send({
        event: 'downloadSong',
        data: {
            index: index
        }
    });

    return false;
};

Core.play = function (e) {
    if (LastActiveIndex)
        Core.removeActiveIndex(LastActiveIndex);

    if (LastActive)
        LastActive.className = '';

    var element;

    if (e.target.nodeName == 'LI')
        element = e.target;
    else
        element = e.target.parentNode;

    var index = element.getAttribute('data-index');

    element.className = 'active';
    LastActive = element;
};

Core.removeActiveIndex = function (index) {
    var i = index - 1;
    document.getElementById('player-wrapper').getElementsByTagName('li')[i].className = '';
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
Core.setActiveByIndex = function (index) {
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
Core.setSongInfo = function (artist, title, totalTime) {
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
Core.event.connect = function () {
    Port = chrome.runtime.connect({name: 'core'});
};

/**
 * Listen for data
 */
Core.event.listenData = function () {
    chrome.runtime.onConnect.addListener(function (bgPort) {
        Core.event.onOpen();
        bgPort.onMessage.addListener(function (msg) {
            console.log(msg);

            if (Core.event.hasOwnProperty(msg.event))
                Core.event[msg.event](msg.data);
        });
    });
};

Core.event.send = function (data) {
    Port.postMessage(data);
};

Core.event.checkFirstLoad = function () {
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
Core.event.setFirstLoadToTrue = function (data) {
    FirstLoad = data;
};

/**
 * Define that is not first load on this session
 *
 * @param {object} data
 */
Core.event.setFirstLoadToFalse = function (data) {
    FirstLoad = data;
};

/**
 * Play song
 */
Core.event.sendPlay = function () {
    Core.event.send({
        event: 'sendPlay',
        data: null
    });
};

Core.event.playSong = function (e) {
    var element = e.target;

    if (element.className != 'save-song' && element.className != 'add-song') {

        if (element.nodeName != 'LI')
            element = element.parentNode;

        var index = element.getAttribute('data-index');

        MFTimeCurrent.textContent = '0:00';
        MFBuffer.style.width = 0;
        MFProgress.style.width = 0;

        Core.event.send({
            event: 'playByIndex',
            data: index
        });
    }
};

Core.event.play = function (data) {
    MFPlay.addEventListener('click', function () {
        if (FirstLoad) {
            Core.event.sendPlay();
            FirstLoad = false;
        } else {
            if (MFPlay.classList.contains('pause')) {
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

Core.event.getSongDuration = function () {
    Core.event.send({
        event: 'getSongDuration',
        data: ''
    });
};

Core.event.setSongDuration = function (data) {
    if (data) {
        MFDuration = data.dur;

        if (data.index)
            Core.scrollToSong(AudioList.getElementsByTagName('li')[data.index]);
    }
};

Core.event.changeSongInfo = function (data) {
    Core.setSongInfo(data.artist, data.title, data.duration);
    MFDuration = data.realDuration;
};

Core.event.sendSetFirstActive = function (data) {
    Core.setActiveByIndex(1);
};

Core.event.timeUpdate = function (data) {
    MFTimeCurrent.textContent = data;
};

Core.event.changePlayToPause = function (data) {
    if (!MFPlay.classList.contains('pause'))
        MFPlay.className += ' pause';
};

/**
 * Change icon to pause
 *
 * @param data
 */
Core.event.changePauseToPlay = function (data) {
    MFPlay.classList.remove('pause');
};

/**
 * Set width of progress bar element
 *
 * @param {string} data
 */
Core.event.setProgressBarWidth = function (data) {
    MFProgress.style.width = data;
};

/**
 * Set width of load process element
 *
 * @param {string} data
 */
Core.event.setLoadProgress = function (data) {
    MFBuffer.style.width = data;
};

/**
 * Highlight new active song in list
 *
 * @param {{oldIndex: number, newIndex: number}} data
 */
Core.event.setNewHighLightElement = function (data) {
    Core.removeActiveIndex(data.oldIndex);
    Core.setActiveByIndex(data.newIndex);
    var index = data.newIndex - 1;
    Core.scrollToSong(AudioList.getElementsByTagName('li')[index]);
};

/**
 * Update list of audio
 */
Core.event.updateList = function () {
    Core.setSizeToMain();
    Core.showOverlay();
    Core.setBlur('audio-list');
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
Core.event.reloadContent = function (data) {
    var updElements = {
        from: 'player-wrapper',
        el: 'audio-list'
    };

    if(data == 'album-list') {
        updElements.from = [updElements.from,'regular-buttons'];
        updElements.el = [updElements.el, 'albums'];
    }

    Core.loadBackgroundContent(true, updElements, function () {
        Core.hideOverlay();
        Core.removeSizeFromMain();
    });
};

Core.event.setActiveCoreUser = function(data) {
    var activeUser = AllUsers.querySelector('.active');
    console.log(data);
    if(activeUser.getAttribute('data-id') != data.id) {
        var newActive = AllUsers.querySelector('div[data-id="'+data.id+'"]');
        activeUser.classList.remove('active');
        newActive.classList.add('active');
    }
};

Core.event.setActiveAlbum = function (data) {
    var activeAlbum = AlbumList.querySelector('.active');

    if (activeAlbum.getAttribute('data-id') != data.id) {
        var newActive = data.id == 'first' ?  AlbumList.querySelector('div:first-child') : AlbumList.querySelector('div[data-id="' + data.id + '"]');
        activeAlbum.classList.remove('active');
        newActive.classList.add('active');
    }
};

Core.event.setRepeatSong = function () {
    Core.event.send({
        event: 'setRepeatSong',
        data: ''
    });
};

Core.event.setActiveRepeat = function () {
    RepeatSong.className = 'active';
};

Core.event.setNonActiveRepeat = function () {
    RepeatSong.className = '';
};

/**
 * Open window for authorization in VK.com
 */
Core.event.authorize = function () {
    Core.event.send({
        event: 'openAuth',
        data: ''
    });
};

/**
 * Send this event when popup will open
 */
Core.event.onOpen = function () {
    Core.event.checkFirstLoad();
    Core.event.getSongDuration();
};

Core.event.setShuffleToActive = function (data) {
    ShuffleSongs.className = 'active';
};

Core.event.setShuffleToDisable = function (data) {
    ShuffleSongs.className = '';
};

Core.event.setBroadcastToActive = function (data) {
    Broadcast.className = 'active';
};

Core.event.setBroadcastToDisable = function (data) {
    Broadcast.className = '';
};

Core.setBlur = function(elemID) {
    var el = document.getElementById(elemID);

    if(el != undefined)
        el.classList.add('blur');
};

Core.removeBlur = function(elemID) {
    document.getElementById(elemID).classList.remove('blur');
};

/**
 * Set width and height to #main
 */
Core.setSizeToMain = function () {
    var MainBlock = document.getElementById('main');
    MainBlock.style.width = MainBlock.clientWidth + 'px';
    MainBlock.style.height = MainBlock.clientHeight + 'px';
};

/**
 * Remove style attribute from #main
 */
Core.removeSizeFromMain = function () {
    document.getElementById('main').removeAttribute('style');
};

Core.showOverlay = function () {
    Overlay.style.display = 'block';
    setTimeout(function () {
        OverlayTxt.className += ' show';
    }, 50);
};

Core.hideOverlay = function () {
    OverlayTxt.classList.remove('show');

    setTimeout(function () {
        Overlay.style.display = 'none';
    }, 50);
};

/**
 * Set opacity to 1
 *
 * @param {string} elementID
 */
Core.showOpacity = function (elementID) {
    var el = document.getElementById(elementID);

    el.classList.remove('hide-opacity');
    el.classList.add('show-opacity');
};


/**
 * Set opacity to 0
 *
 * @param {string} elementID
 */
Core.hideOpacity = function (elementID) {
    var el = document.getElementById(elementID);

    el.classList.remove('show-opacity');
    el.classList.add('hide-opacity');
};

/**
 * Auth user & get songs from background page
 */
Core.auth = function () {
    Core.loadBackgroundContent();
};

/**
 * Load background page
 *
 * @param {object|boolean} port
 * @param {object} elementID
 * @param {function} callback
 */
Core.loadBackgroundContent = function (port, elementID, callback) {
    chrome.runtime.getBackgroundPage(function (win) {
        var node;

        if (typeof elementID == 'object') {
            if(elementID.from instanceof Array) {
                for(var i = 0, size = elementID.from.length; i < size; i++) {
                    var from = elementID.from[i],
                        el = elementID.el[i];

                    document.getElementById(from).removeChild(document.getElementById(el));
                    node = document.importNode(win.document.getElementById(el), true);
                    document.getElementById(from).appendChild(node);

                    if(from == 'regular-buttons') {
                        Core.setAlbumEvents();
                    }
                }
            } else {
                document.getElementById(elementID.from).removeChild(document.getElementById(elementID.el));
                node = document.importNode(win.document.getElementById(elementID.el), true);
                document.getElementById(elementID.from).appendChild(node);
            }
        } else {
            node = document.importNode(win.document.getElementById('main'), true);
            document.body.appendChild(node);
        }

        if (localStorage['authInfo'] != undefined) {
            Core.audioEvent();

            if (win.LastActiveIndex)
                LastActiveIndex = win.LastActiveIndex;

            MFCore.init();

            if (!isElements && !isEvents) {
                Core.setElements();
                Core.setEvents();

                isElements = true;
                isEvents = true;
            }

            if (!port) {
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

        if (!elementID)
            Core.showOpacity('wrapper');

        if (callback)
            callback();
    });
};

Core.openSettings = function () {
    chrome.tabs.create({url: chrome.runtime.getURL('/templates/settings.html')});
    window.close();
};

Core.scrollToSong = function (element) {
    var offset = element.offsetTop - element.clientHeight - AudioList.scrollTop;

    if (offset > AudioList.clientHeight)
        AudioList.scrollTop = element.offsetTop - AudioList.clientHeight - (element.clientHeight - element.clientHeight / 2) - 1;
    else if (offset < 0)
        AudioList.scrollTop = element.offsetTop - (element.clientHeight + element.clientHeight / 2) - 4;
};

/**
 * Show all users
 *
 * @param {event} e
 */
Core.openAllUsers = function (e) {
    CurrentUser.getElementsByClassName('user')[0].classList.toggle('active');

    if (AllUsers.classList.contains('opened')) {
        AllUsers.removeAttribute('style');
        AllUsers.className = '';
    } else {
        var arr = ['-', AllUsers.clientHeight - 1, 'px'];
        AllUsers.style.top = arr.join('');
        AllUsers.className = 'opened';
    }
};

/**
 * Show all user albums
 *
 * @param {event} e
 */
Core.openAlbums = function (e) {
    AlbumTitle.classList.toggle('active');

    if (AlbumList.classList.contains('opened')) {
        AlbumList.removeAttribute('style');
        AlbumList.className = '';
    } else {
        var arr = ['-', AlbumList.clientHeight - 1, 'px'];
        AlbumList.style.top = arr.join('');
        AlbumList.className = 'opened';
    }
};

/**
 * Choose user playlist
 */
Core.allUsersEvents = function () {
    var users = AllUsers.getElementsByClassName('user');

    for (var i = 0, size = users.length; i < size; i++) {
        users[i].addEventListener('click', function (e) {
            Core.setSizeToMain();
            Core.showOverlay();
            Core.setBlur('audio-list');
            var cloneUsr = this.cloneNode(true);

            if(!cloneUsr.classList.contains('active')) {
                cloneUsr.classList.add('active');
            }

            CurrentUser.removeChild(CurrentUser.getElementsByClassName('user')[0])
            CurrentUser.appendChild(cloneUsr);

            Core.event.send({
                event: 'setActiveUser',
                data: this.getAttribute('data-id')
            });
        });
    }
};

Core.allAlbumsEvents = function () {
    var allAlbums = AlbumList.getElementsByTagName('div');

    for (var i = 0, size = allAlbums.length; i < size; i++) {
        allAlbums[i].addEventListener('click', function (e) {
            Core.setSizeToMain();
            Core.showOverlay();

            AlbumTitle.textContent = this.textContent == chrome.i18n.getMessage('allSongs') ? chrome.i18n.getMessage('albums') : this.textContent;
            var dID = this.getAttribute('data-id'),
                rID;

            if (dID == 'null')
                rID = undefined;
            else
                rID = dID;

            Core.setBlur('audio-list');
            Core.event.send({
                event: 'loadAlbum',
                data: {
                    id: rID,
                    title: this.textContent
                }
            });
        });
    }
};

Core.shuffleSongs = function () {
    Core.event.send({
        event: 'setShuffleSongs',
        data: ''
    });
};

Core.broadcastSong = function () {
    Core.event.send({
        event: 'setBroadcastSong',
        data: ''
    });
};

/**
 * Init events
 */
Core.setEvents = function () {
    UpdateList.addEventListener('click', Core.event.updateList);
    Settings.addEventListener('click', Core.openSettings);
    CurrentUser.addEventListener('click', Core.openAllUsers);
    RepeatSong.addEventListener('click', Core.event.setRepeatSong);
    Core.allUsersEvents();
    Core.allAlbumsEvents();
    AlbumTitle.addEventListener('click', Core.openAlbums);
    ShuffleSongs.addEventListener('click', Core.shuffleSongs);
    Broadcast.addEventListener('click', Core.broadcastSong);
};

Core.setAlbumEvents = function() {
    Core.setElements();
    Core.allAlbumsEvents();
    AlbumTitle.addEventListener('click', Core.openAlbums);
};

/**
 * Init DOM elements
 */
Core.setElements = function () {
    UpdateList = document.getElementById('update-list');
    Overlay = document.getElementById('bg-overlay');
    OverlayTxt = document.getElementById('overlay-txt');
    Settings = document.getElementById('settings');
    CurrentUser = document.getElementById('current-user');
    AllUsers = document.getElementById('all-users');
    RepeatSong = document.getElementById('repeat-song');
    AlbumList = document.getElementById('album-list');
    AlbumTitle = document.getElementById('album-title');
    AudioList = document.getElementById('audio-list');
    ShuffleSongs = document.getElementById('shuffle-play');
    Broadcast = document.getElementById('broadcast');
};


/**
 * Control right click
 */
Core.rightClick = function () {
    document.addEventListener('contextmenu', function (e) {
        if (!RightClick) {
            e.preventDefault();
            return false;
        }
    });
};

/**
 * Init functions
 */
Core.init = function () {
    Core.auth();
    Core.rightClick();
};

window.addEventListener('DOMContentLoaded', Core.init);