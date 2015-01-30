VKit.trackUser();

var Port,
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
    isElements = false,
    CONST = {
        PAGE_RELOADED: false
    },
    CACHE = {
        PRELOADERS: {
            AUDIO_LIST: '<div class="lines"><div class="element"></div><div class="element"></div><div class="element"></div><div class="element"></div><div class="element"></div></div>'
        }
    };

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
        song.getElementsByClassName('artist')[0].addEventListener('click', Core.fillSearch);

        song.addEventListener('click', Core.event.playSong);
    }
};

Core.fillSearch = function () {
    CACHE.SEARCH.value = this.textContent;
    Core.audioSearch();
};

//Core.downloadSong = function (e) {
//    e.preventDefault();
//
//    var index = this.parentNode.getAttribute('data-index');
//
//    Core.event.send({
//        event: 'downloadSong',
//        data: {
//            index: index
//        }
//    });
//
//    return false;
//};

Core.play = function (e) {
    if (LastActiveIndex) {
        Core.removeActiveIndex(LastActiveIndex);
    }

    if (LastActive) {
        LastActive.className = '';
    }

    var element;

    if (e.target.nodeName == 'LI') {
        element = e.target;
    } else {
        element = e.target.parentNode;
    }

    var index = element.getAttribute('data-index');

    element.className = 'active';
    LastActive = element;
};

Core.removeActiveIndex = function (index) {
    document.querySelector('#songs-list li[data-aid="' + index + '"]').className = '';
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
Core.setActiveByIndex = function (index) {
    document.querySelector('#songs-list li[data-aid="' + index + '"]').className = 'active';
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
            //if (msg.event != 'setProgressBarWidth' && msg.event != 'timeUpdate' && msg.event != 'setLoadProgress') {
            //    console.log(msg);
            //}

            if (msg.event != 'setProgressBarWidth' && msg.event != 'timeUpdate' && msg.event != 'setLoadProgress') {
                console.log(msg);
            }

            if (Core.event.hasOwnProperty(msg.event)) {
                Core.event[msg.event](msg.data);
            }
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
    FirstLoad = true;
};

/**
 * Define that is not first load on this session
 *
 * @param {object} data
 */
Core.event.setFirstLoadToFalse = function (data) {
    FirstLoad = false;
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
    if (e.target.nodeName == 'LI') {
        MFTimeCurrent.textContent = '0:00';
        MFBuffer.style.width = 0;
        MFProgress.style.width = 0;

        Core.event.send({
            event: 'playByIndex',
            data: {
                index: this.getAttribute('data-index'),
                aid: this.getAttribute('data-aid')
            }
        });
    }
};

Core.event.isFirstSongPlayed = function (data) {
    if (!CONST.PAGE_RELOADED && FirstLoad && data) {
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
};

Core.event.play = function (data) {
    MFPlay.addEventListener('click', function () {
        Core.event.send({
            event: 'isFirstSongPlayed',
            data: ''
        });
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

        if (data.index) {
            var el = Core.getSongElementByAID(data.index);

            if (el) {
                Core.scrollToSong(el);
            }
        }
    }
};

Core.event.setPageReloadInfo = function () {
    Core.event.send({
        event: 'setPageReloadInfo',
        data: CONST.PAGE_RELOADED
    });
};

Core.event.setPageReloadState = function (data) {
    CONST.PAGE_RELOADED = data;
};

Core.event.changeSongInfo = function (data) {
    Core.setSongInfo(data.artist, data.title, data.realDuration);
    MFDuration = data.duration;
};

Core.event.sendSetFirstActive = function (data) {
    Core.setActiveByIndex(1);
};

Core.event.timeUpdate = function (data) {
    MFTimeCurrent.textContent = data;
};

Core.event.changePlayToPause = function (data) {
    if (!MFPlay.classList.contains('pause')) {
        MFPlay.className += ' pause';
    }
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
    var newEl = Core.getSongElementByAID(data.newIndex),
        oldEl = Core.getSongElementByAID(data.oldIndex);

    if (oldEl) {
        oldEl.className = '';
    }

    newEl.className = 'active';

    Core.scrollToSong(newEl);
};

/**
 * Update list of audio
 */
Core.event.updateList = function () {
    Core.setSizeToMain();
    Core.showOverlay();
    Core.setBlur('songs-list');
    Core.eraseSearchInput();

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
        el: 'songs-list'
    };

    if (data == 'album-list') {
        updElements.from = [updElements.from, 'regular-buttons'];
        updElements.el = [updElements.el, 'albums'];
    }

    if (data.removeSearchAjax) {
        CACHE.SEARCH_LOAD = true;
    }

    Core.loadBackgroundContent(true, updElements, function () {
        if (data.removeSearchAjax) {
            CACHE.SEARCH_LOAD = false;
            Core.hideSearchAjax();
            Core.hideOverlay();
        } else {
            Core.hideOverlay();
        }

        Core.removeSizeFromMain();
    });
};

Core.event.setActiveCoreUser = function (data) {
    var activeUser = AllUsers.querySelector('.active');

    if (activeUser.getAttribute('data-id') != data.id) {
        var newActive = AllUsers.querySelector('div[data-id="' + data.id + '"]');
        activeUser.classList.remove('active');
        newActive.classList.add('active');
    }
};

Core.event.setActiveAlbum = function (data) {
    var activeAlbum = AlbumList.querySelector('.active');

    if (activeAlbum.getAttribute('data-id') != data.id) {
        var newActive = data.id == 'first' ? AlbumList.querySelector('div:first-child') : AlbumList.querySelector('div[data-id="' + data.id + '"]');
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
    Core.event.setPageReloadInfo();
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

Core.event.loadEmptyPage = function (data) {
    //document.body.removeChild(document.getElementById('main'));

    Core.loadBackgroundContent(false, false, function () {
        Core.setAllUsersEvents();
        Core.setEvents();
        Core.hideOverlay();
    });
};

Core.event.setAudioSearchType = function (data) {
    var mainEl = document.getElementById(data.searchTypeID),
        el = mainEl.querySelector('.search-select-type div[data-index="' + data.index + '"]'),
        searchDefValue = mainEl.querySelector('.select-default-value'),
        typesList = mainEl.querySelector('.types-list');

    searchDefValue.textContent = data.text;

    typesList.querySelector('.active').classList.remove('active');
    el.classList.add('active');

    typesList.classList.remove('show');
    typesList.insertAdjacentElement('afterBegin', el);
};

Core.event.setAudioSearchLyricsCheckbox = function (data) {
    CACHE.LYRICS_CHECKBOX.checked = data;
};

Core.event.searchSongs = function () {
    Core.event.send({
        event: 'searchAudio',
        data: {
            q: CACHE.SEARCH.value
        }
    });
};

Core.event.hideOverlay = function () {
    Core.hideOverlay();
};

/**
 * Check if we in search state
 *
 * @returns {boolean}
 */
Core.checkForSearchState = function () {
    return CACHE.SEARCH.value.length > 0;
};

Core.setBlur = function (elemID) {
    var el = document.getElementById(elemID);

    if (el != undefined) {
        el.classList.add('blur');
    }
};

Core.removeBlur = function (elemID) {
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

/**
 * Overlay
 *
 * @param {boolean} onlyForButtons
 */
Core.showOverlay = function (onlyForButtons) {
    if (document.getElementById('empty-list').style.display == 'block') {
        Overlay.setAttribute('style', 'display:block;top:0;height:100%;');
    } else {
        Overlay.style.display = 'block';
    }

    if (onlyForButtons) {
        var ovHeight = CACHE.WRAPPER.clientHeight - CACHE.APP_NAV_BLOCK.clientHeight;

        Overlay.style.top = ovHeight + 'px';
        OverlayTxt.classList.add('hide');
    } else {
        Overlay.style.top = document.querySelector('.c-wrapper').clientHeight + 'px';
        OverlayTxt.classList.remove('hide');

        var height = Overlay.clientHeight / 2 - OverlayTxt.clientHeight;
        OverlayTxt.style.marginTop = height + 'px';
    }

    setTimeout(function () {
        Overlay.className += ' show';
    }, 20);
};

Core.hideOverlay = function () {
    Overlay.classList.remove('show');

    setTimeout(function () {
        Overlay.setAttribute('style', 'display:none;');
    }, 20);
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
            if (elementID.from instanceof Array) {
                for (var i = 0, size = elementID.from.length; i < size; i++) {
                    var from = elementID.from[i],
                        el = elementID.el[i];

                    document.getElementById(from).removeChild(document.getElementById(el));
                    node = document.importNode(win.document.getElementById(el), true);
                    document.getElementById(from).appendChild(node);

                    if (from == 'regular-buttons') {
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

            if (win.LastActiveIndex) {
                LastActiveIndex = win.LastActiveIndex;
            }

            if (!CONST.PAGE_RELOADED || !CACHE.SEARCH_LOAD) {
                MFCore.init();
            }

            if (!isElements && !isEvents) {
                Core.setElements.all();
                Core.setEvents();

                isElements = true;
                isEvents = true;
            }

            Core.setElements.search();

            if (!port) {
                Core.event.listenData();
                Core.event.connect();
            } else {
                if (!CACHE.SEARCH_LOAD) {
                    Core.event.onOpen();
                }
            }

            if (!CONST.PAGE_RELOADED && !CACHE.SEARCH_LOAD) {
                Core.event.play();
            }
        } else {
            var authButton = document.getElementById('vk-auth');
            document.getElementById('app-nav-block').style.display = 'none';

            Core.event.listenData();
            Core.event.connect();

            authButton.addEventListener('click', Core.event.authorize);
        }

        if (!elementID)
            Core.showOpacity('wrapper');

        if (callback && typeof callback == 'function') {
            callback();
        }
    });
};

Core.openSettings = function () {
    chrome.tabs.query({currentWindow: true}, function (tabs) {
        for (var i = 0, size = tabs.length; i <= size; i++) {
            if (i == tabs.length) {
                window.open(chrome.extension.getURL('/templates/settings.html'));
            } else if (tabs[i].url == chrome.extension.getURL('/templates/settings.html')) {
                chrome.tabs.highlight({
                    windowId: chrome.windows.WINDOW_ID_CURRENT,
                    tabs: tabs[i].index
                }, function (response) {
                });
                break;
            }
        }
    });
};

Core.scrollToSong = function (element) {
    var songList = CACHE.SEARCH.value.length > 0 ? CACHE.SEARCH_SONGS_LIST : AudioList,
        offset = element.offsetTop - element.clientHeight - songList.scrollTop - CACHE.SEARCH_WRAPPER.clientHeight;

    if (offset > songList.clientHeight) {
        songList.scrollTop = element.offsetTop - songList.clientHeight - CACHE.SEARCH_WRAPPER.clientHeight - (element.clientHeight - element.clientHeight / 2) - 1;
    } else if (offset < 0) {
        songList.scrollTop = element.offsetTop - CACHE.SEARCH_WRAPPER.clientHeight - (element.clientHeight + element.clientHeight / 2) - 7;
    }
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

Core.eraseSearchInput = function () {
    CACHE.SEARCH.value = '';
    CACHE.EMPTY_SEARCH.classList.remove('show');

    Core.event.send({
        event: 'clearSearchInput',
        data: ''
    });
};

Core.setActiveUser = function () {
    Core.setSizeToMain();
    Core.showOverlay();
    Core.setBlur('songs-list');
    var cloneUsr = this.cloneNode(true);

    if (!cloneUsr.classList.contains('active')) {
        cloneUsr.classList.add('active');
    }

    CurrentUser.removeChild(CurrentUser.getElementsByClassName('user')[0])
    CurrentUser.appendChild(cloneUsr);

    if (Core.checkForSearchState()) {
        Core.eraseSearchInput();
    }

    Core.event.send({
        event: 'setActiveUser',
        data: this.getAttribute('data-id')
    });
};

/**
 * Choose user playlist
 */
Core.allUsersEvents = function () {
    var users = AllUsers.getElementsByClassName('user');

    for (var i = 0, size = users.length; i < size; i++) {
        users[i].addEventListener('click', Core.setActiveUser);
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

            if (dID == 'null') {
                rID = undefined;
            } else {
                rID = dID;
            }

            Core.setBlur('songs-list');
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
 * Get <li> element by Audio ID
 *
 * @param {Number} aid
 * @returns {HTMLElement}
 */
Core.getSongElementByAID = function (aid) {
    return document.querySelector('#songs-list li[data-aid="' + aid + '"]');
};

/**
 * Search input
 *
 * @param {Event} e
 */
Core.audioSearch = function (e) {
    clearTimeout(CACHE.TYPING_TIMER);
    Core.showOverlay(true);

    if (CACHE.SEARCH.value.length > 0) {
        CACHE.EMPTY_SEARCH.classList.add('show');

        Core.showSearchAjax();

        if (!CACHE.SEARCH_AJAX) {
            CACHE.SEARCH_AJAX = true;
        }

        CACHE.TYPING_TIMER = setTimeout(function () {
            Core.event.searchSongs();
        }, CACHE.FINISH_TYPING_INTERVAL);
    } else {
        Core.showAudioList();
        CACHE.SEARCH_AJAX = false;
        CACHE.EMPTY_SEARCH.classList.remove('show');
        Core.event.searchSongs();
    }
};

/**
 * Search settigns custom select elements
 *
 * @param {Event} e
 */
Core.searchTypesList = function (e) {
    e.stopPropagation();

    var typesList = this.getElementsByClassName('types-list')[0];

    if (this.classList.contains('show')) {
        this.classList.remove('show');
        typesList.classList.remove('show');
    } else {
        this.classList.add('show');
        typesList.classList.add('show');
    }
};

Core.trackActiveElements = function (e) {

};

/**
 * Search settings
 *
 * @param {Event} e
 */
Core.changeAudioSearchType = function (e) {
    var searchTypeID = '',
        node = this,
        dataValue = this.getAttribute('data-value');

    while (node.parentNode) {
        node = node.parentNode;

        if (node.classList.contains('search-select-type')) {
            searchTypeID = node.getAttribute('id');
            break;
        }
    }

    Core.event.send({
        event: 'changeAudioSearchType',
        data: {
            text: this.textContent,
            index: this.getAttribute('data-index'),
            searchTypeID: searchTypeID,
            dataValue: dataValue
        }
    });
};

/**
 * Show last active audio list
 */
Core.showAudioList = function () {
    CACHE.AJAX_CONTENT_LOADER.classList.remove('show');
    AudioList.classList.remove('hide');

    if (CACHE.SEARCH_SONGS_LIST) {
        CACHE.SEARCH_SONGS_LIST.classList.add('hide');
        Core.clearElement(CACHE.SEARCH_SONGS_LIST);
    }

    CACHE.SONGS_LIST.classList.remove('hide');

    CACHE.AJAX_CONTENT_LOADER_HEIGHT = false;
};

/**
 * Show preloader indicator
 */
Core.showSearchAjax = function () {
    if (!CACHE.AJAX_CONTENT_LOADER_HEIGHT) {
        var alStyles = window.getComputedStyle(AudioList),
            height = CACHE.SONGS_LIST.clientHeight + parseInt(alStyles['margin-bottom']) + parseInt(alStyles['padding-top']) + parseInt(alStyles['padding-bottom']);

        CACHE.AJAX_CONTENT_LOADER.style.height = height + 'px';
        CACHE.AJAX_CONTENT_LOADER_HEIGHT = true;
    }

    CACHE.SONGS_LIST.classList.add('hide');
    AudioList.classList.add('hide');
    CACHE.AJAX_CONTENT_LOADER.classList.add('show');
};

Core.hideSearchAjax = function () {
    CACHE.AJAX_CONTENT_LOADER.classList.remove('show');
    CACHE.AJAX_CONTENT_LOADER_HEIGHT = false;
};

/**
 * Open search settings
 */
Core.openSearchSettings = function () {
    if (this.classList.contains('opened')) {
        CACHE.SEARCH_SETTINGS.classList.remove('show');
        this.classList.remove('opened');
    } else {
        CACHE.SEARCH_SETTINGS.classList.add('show');
        this.classList.add('opened');
    }
};

Core.searchInputKeysEvents = function (e) {
    if (e.keyCode == 13) {
        Core.audioSearch();
    }
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
    Core.setAudioSearchConfigsEvents();
    document.addEventListener('click', Core.trackActiveElements);
};

Core.setAlbumEvents = function () {
    Core.setElements.all();
    Core.allAlbumsEvents();
    AlbumTitle.addEventListener('click', Core.openAlbums);
};

Core.setAllUsersEvents = function () {
    Core.setAlbumEvents();
    CurrentUser.addEventListener('click', Core.openAllUsers);
    Core.allUsersEvents();
};

Core.setAudioSearchConfigsEvents = function () {
    CACHE.TYPING_TIMER = null;
    CACHE.FINISH_TYPING_INTERVAL = 400;

    CACHE.SEARCH.addEventListener('input', Core.audioSearch);
    CACHE.SEARCH.addEventListener('keypress', Core.searchInputKeysEvents);
    CACHE.SEARCH_SETTINGS_BUTTON.addEventListener('click', Core.openSearchSettings);

    CACHE.EMPTY_SEARCH.addEventListener('click', function () {
        CACHE.SEARCH.value = '';
        this.classList.remove('show');
        Core.showAudioList();

        Core.event.send({
            event: 'clearSearchInput',
            data: ''
        });
    });

    for (var i = 0, size = CACHE.SEARCH_SELECT_TYPES.length; i < size; i++) {
        var selectWrapper = CACHE.SEARCH_SELECT_TYPES[i];

        selectWrapper.addEventListener('click', Core.searchTypesList);
    }

    var typesList = document.getElementsByClassName('types-list');

    for (var i = 0, size = typesList.length; i < size; i++) {
        var list = typesList[i],
            elements = list.getElementsByClassName('option');

        for (var j = 0, optSize = elements.length; j < optSize; j++) {
            elements[j].addEventListener('click', Core.changeAudioSearchType);
        }
    }

    CACHE.LYRICS_CLICK_OVERLAY.addEventListener('click', function (e) {
        e.stopPropagation();

        Core.event.send({
            event: 'setAudioSearchLyricsCheckbox',
            data: !CACHE.LYRICS_CHECKBOX.checked
        });
    });
};

/**
 * Init DOM elements
 */
Core.setElements = {
    all: function () {
        UpdateList = document.getElementById('update-list');
        Overlay = document.getElementById('bg-overlay');
        OverlayTxt = document.getElementById('overlay-txt');
        Settings = document.getElementById('settings');
        CurrentUser = document.getElementById('current-user');
        AlbumList = document.getElementById('album-list');
        AllUsers = document.getElementById('all-users');
        RepeatSong = document.getElementById('repeat-song');
        AlbumTitle = document.getElementById('album-title');
        ShuffleSongs = document.getElementById('shuffle-play');
        Broadcast = document.getElementById('broadcast');
        CACHE.SEARCH_WRAPPER = document.getElementById('search-wrapper');
        CACHE.APP_NAV_BLOCK = document.getElementById('app-nav-block');
        this.search();
    },
    search: function () {
        AudioList = document.getElementById('audio-list');
        CACHE.WRAPPER = document.getElementById('wrapper');
        CACHE.PLAYER_WRAPPER = document.getElementById('player-wrapper');
        CACHE.SONGS_LIST = document.getElementById('songs-list');
        CACHE.SEARCH_SONGS_LIST = document.getElementById('search-list');
        CACHE.SEARCH_SETTINGS_BUTTON = document.getElementById('open-search-settings');
        CACHE.SEARCH_SETTINGS = document.getElementById('search-settings');
        CACHE.SEARCH = document.getElementById('search');
        CACHE.EMPTY_SEARCH = document.getElementById('empty-search');
        CACHE.SEARCH_SELECT_TYPES = document.getElementsByClassName('search-select-type');
        CACHE.LYRICS_CHECKBOX = document.getElementById('lyrics');
        CACHE.LYRICS_CHECKBOX_LABEL = document.querySelector('#lyrics-checkbox-wrapper label');
        CACHE.LYRICS_CLICK_OVERLAY = document.querySelector('#lyrics-checkbox-wrapper .click-overlay');
        CACHE.AJAX_CONTENT_LOADER = document.getElementById('ajax-content-loader');
    }
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

Core.clearElement = function (element) {
    var i = element.childElementCount;

    while (--i >= 0)
        element.removeChild(element.firstChild);
};

/**
 * Init functions
 */
Core.init = function () {
    Core.auth();
    Core.rightClick();
};

/**
 * Start point
 */
window.addEventListener('DOMContentLoaded', Core.init);