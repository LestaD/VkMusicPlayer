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
    },
    currUserID = JSON.parse(localStorage['authInfo']).userID;

/**
 * Main object
 *
 * @type {object} Object
 */
var Core = {};

Core.audioEvent = function () {
    var songs = document.querySelectorAll('#songs-list > ul > li');

    for (var i = 0, size = songs.length; i < size; i++) {
        var song = songs[i],
            artist = song.getElementsByClassName('artist')[0],
            addTo = song.getElementsByClassName('add-to')[0],
            addToMyAudioList = addTo.getElementsByClassName('add-to-my-audio-list')[0],
            addToAlbum = addTo.getElementsByClassName('add-to-album-show')[0],
            addToAlbumSubItems = addToAlbum.querySelectorAll('.sub-menu > ul > li'),
            postSong = addTo.getElementsByClassName('post-on-wall')[0],
            recSongs = song.getElementsByClassName('show-rec-songs')[0],
            removeSong = song.getElementsByClassName('remove-song')[0],
            yesRemove = song.getElementsByClassName('yes-remove')[0],
            noRemove = song.getElementsByClassName('no-remove')[0],
            removeFromAlbum = song.getElementsByClassName('remove-from-album')[0];

        artist.addEventListener('click', Core.fillSearch);

        addTo.addEventListener('mouseenter', Core.addToMouseEnter);
        addTo.addEventListener('mouseleave', Core.addToMouseLeave);

        if (addToMyAudioList) {
            addToMyAudioList.addEventListener('click', Core.addSongToMyAudioList);
        }

        addToAlbum.addEventListener('mouseenter', Core.addToAlbumMouseEnter);
        addToAlbum.addEventListener('mouseleave', Core.addToAlbumMouseLeave);

        for (var j = 0, jSize = addToAlbumSubItems.length; j < jSize; j++) {
            addToAlbumSubItems[j].addEventListener('click', Core.addSongToAlbum);
        }

        postSong.addEventListener('click', Core.shareSong);

        recSongs.addEventListener('click', Core.showRecSongs);

        if (removeSong) {
            removeSong.addEventListener('click', Core.showRemoveOverlay);

            yesRemove.addEventListener('click', Core.removeSong);
            noRemove.addEventListener('click', Core.hideSureOverlay);
        }

        if(removeFromAlbum) {
            removeFromAlbum.addEventListener('click', Core.removeFromAlbum);
        }

        song.addEventListener('click', Core.event.playSong);
    }
};

Core.removeFromAlbum = function() {
    var li = this.parentNode.parentNode;

    Core.event.send({
        event: 'removeFromAlbum',
        data: li.getAttribute('data-aid')
    });

    li.remove();
};

Core.removeSong = function () {
    this.classList.add('active');

    var sOverlay = this.parentNode,
        li = sOverlay.parentNode;

    this.nextSibling.classList.add('hide');
    sOverlay.classList.add('active');

    Core.event.send({
        event: 'removeSong',
        data: li.getAttribute('data-aid')
    });
};

Core.hideSureOverlay = function () {
    var li = this.parentNode.parentNode;

    this.parentNode.classList.remove('show');

    Core.event.send({
        event: 'hideRemoveOverlay',
        data: li.getAttribute('data-aid')
    });

};

Core.showRemoveOverlay = function () {
    var li = this.parentNode.parentNode;

    li.getElementsByClassName('sure-overlay')[0].classList.add('show');

    Core.event.send({
        event: 'showRemoveOverlay',
        data: li.getAttribute('data-aid')
    })
};

Core.removeRecState = function () {
    CONST.REC_ACTIVE = false;
    CACHE.REC_OVERLAY.classList.remove('show');

    if (!AudioList && !CACHE.SEARCH_LIST) {
        CACHE.EMPTY_LIST.classList.add('show');
    }

    Core.showAudioList();
    CACHE.SEARCH_AJAX = false;

    Core.event.send({
        event: 'clearSearchInput',
        data: {
            hideRec: true
        }
    });
};

Core.showRecSongs = function () {
    CONST.REC_ACTIVE = true;
    CACHE.REC_OVERLAY.classList.add('show');
    Core.showOverlay(true);
    Core.showSearchAjax();

    Core.event.send({
        event: 'showRecSongs',
        data: this.getAttribute('data-id')
    });
};

Core.shareSong = function () {
    if (!this.classList.contains('added') && !this.classList.contains('in-process')) {
        this.classList.add('in-process');

        Core.event.send({
            event: 'shareSong',
            data: this.getAttribute('data-arr')
        });
    }
};

Core.addSongToMyAudioList = function () {
    if (!this.classList.contains('added') && !this.classList.contains('in-process')) {
        this.classList.add('in-process');

        Core.event.send({
            event: 'addSongToMyAudioList',
            data: this.getAttribute('data-arr')
        });
    }
};

Core.addSongToAlbum = function () {
    var mainEl = this.parentNode.parentNode.parentNode,
        el = this,
        h = el.clientHeight,
        albumTitle = el.getElementsByClassName('albumTitle')[0],
        data = mainEl.getAttribute('data-arr').split(',');


    if (CACHE.LAST_ADDED_ALBUM == undefined) {
        CACHE.LAST_ADDED_ALBUM = albumTitle;
    } else {
        CACHE.LAST_ADDED_ALBUM.removeAttribute('style');
        CACHE.LAST_ADDED_ALBUM = albumTitle;
    }

    albumTitle.style.marginTop = '-' + h + 'px';

    //add song to audio list and then add to album
    if (data[2] == 'true') {
        VKit.api('audio.add', ['audio_id=' + data[0], 'owner_id=' + data[1]], function (response) {
            var aid = JSON.parse(response).response;

            VKit.api('audio.moveToAlbum', ['album_id=' + el.getAttribute('data-id'), 'audio_ids=' + aid], function (response) {
                albumTitle.style.marginTop = '-' + h * 2 + 'px';
            });
        });
    } else { // add song to album
        VKit.api('audio.moveToAlbum', ['album_id=' + el.getAttribute('data-id'), 'audio_ids=' + data[0]], function (response) {
            albumTitle.style.marginTop = '-' + h * 2 + 'px';
        });
    }

    //var code = 'var addSong = API.audio.add({audio_id:'+data[0]+',owner_id:'+data[1]+'}); var addSongToAlbum = API.audio.moveToAlbum({album_id='+el.getAttribute('data-id')+',audio_ids: addSong.aid}); return [addSong,addSongToAlbum];';
    //VKit.api('execute', ['code=' + code], function (response) {
    //
    //});
};

Core.addToAlbumMouseEnter = function () {
    Core.calculateDropDrownMenuPosition(this, 'sub-menu');
};

Core.addToAlbumMouseLeave = function () {
    var subMenu = this.getElementsByClassName('sub-menu')[0];
    subMenu.removeAttribute('style');
    subMenu.classList.remove('show');
};

Core.calculateDropDrownMenuPosition = function (element, elClass) {
    var addToList = element.getElementsByClassName(elClass)[0],
        addToListData = addToList.getBoundingClientRect(),
        h = 0;

    var songList = CACHE.SEARCH.value.length > 0 || CONST.REC_ACTIVE == true ? CACHE.SEARCH_SONGS_LIST : AudioList,
        songListStyles = window.getComputedStyle(songList),
        topOffset = document.querySelector('.c-wrapper').clientHeight + CACHE.SEARCH_WRAPPER.clientHeight + parseInt(songListStyles.paddingTop),
        addListOffset = addToListData.top - topOffset,
        addListOffSetHeight = addToListData.top + addToListData.height;

    if (addListOffSetHeight > songList.clientHeight) {
        if (elClass == 'sub-menu') {
            h = Math.abs(songList.clientHeight - addToListData.bottom) - 90 + parseInt(songListStyles.paddingBottom) + 1;
        } else {
            h = Math.abs(songList.clientHeight - addToListData.bottom) - 90 + parseInt(songListStyles.paddingBottom);
        }

        addToList.style.top = '-' + h + 'px';
    } else if (addListOffset < 0) {
        h = topOffset - addToListData.top - parseInt(songListStyles.paddingTop) + 2;
        addToList.style.top = h + 'px';
    }

    addToList.classList.add('show');
};

Core.addToMouseEnter = function () {
    Core.calculateDropDrownMenuPosition(this.parentNode.parentNode, 'add-to-list');
};

Core.addToMouseLeave = function () {
    var addListEl = this.getElementsByClassName('add-to-list')[0];

    addListEl.classList.remove('show');
    addListEl.removeAttribute('style');
};

Core.fillSearch = function () {
    CACHE.SEARCH.value = this.textContent.trim();
    Core.audioSearch();
};

Core.play = function (e) {
    if (LastActiveIndex) {
        Core.removeActiveIndex(LastActiveIndex);
    }

    if (LastActive) {
        LastActive.classList.remove('active');
    }

    var element;

    if (e.target.nodeName == 'LI') {
        element = e.target;
    } else {
        element = e.target.parentNode;
    }

    var index = element.getAttribute('data-index');

    element.classList.add('active');
    LastActive = element;
};

Core.removeActiveIndex = function (index) {
    document.querySelector('#songs-list li[data-aid="' + index + '"]').classList.remove('active');
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
Core.setActiveByIndex = function (index) {
    document.querySelector('#songs-list li[data-aid="' + index + '"]').classList.add('active');
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
    if (e.target.nodeName == 'LI' && e.target.classList.contains('main-song-wrapper')) {
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

Core.event.changePlayToPause = function () {
    if (!MFPlay.classList.contains('pause')) {
        MFPlay.className += ' pause';
    }
};

/**
 * Change icon to pause
 */
Core.event.changePauseToPlay = function () {
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
        oldEl.classList.remove('active');
    }

    newEl.classList.add('active');

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

    CONST.REC_ACTIVE = false;
    CACHE.REC_OVERLAY.classList.remove('show');

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
    RepeatSong.classList.add('active');
};

Core.event.setNonActiveRepeat = function () {
    RepeatSong.classList.remove('active');
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

Core.event.setShuffleToActive = function () {
    ShuffleSongs.classList.add('active');
};

Core.event.setShuffleToDisable = function () {
    ShuffleSongs.classList.remove('active');
};

Core.event.setBroadcastToActive = function () {
    Broadcast.classList.add('active');
};

Core.event.setBroadcastToDisable = function () {
    Broadcast.classList.remove('active');
};

Core.event.loadEmptyPage = function () {
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
    typesList.insertAdjacentElement('afterbegin', el);
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

Core.event.closeAlbumsBox = function () {
    Core.closeWBox(CACHE.ADD_ALBUM_WRAPPER);
};

Core.event.songWasAdded = function (data) {
    var arr = data.split(','),
        li = document.querySelector('#songs-list li[data-aid="' + arr[0] + '"] .add-to-list .add-to-my-audio-list');

    if (li) {
        li.classList.remove('in-process');
        li.classList.add('added');
    }

};

Core.event.songWasShared = function (data) {
    var arr = data.split('_'),
        li = document.querySelector('#songs-list li[data-aid="' + arr[1] + '"] .add-to-list .post-on-wall');

    if (li) {
        li.classList.remove('in-process');
        li.classList.add('added');
    }
};

Core.event.removeSongNode = function(data) {
    var el = document.querySelector('#songs-list li[data-aid="' + data + '"]');

    if(el) {
        el.remove();
    }
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
Core.showOverlay = function (onlyForButtons, notSongsUpdate) {
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

        if (!notSongsUpdate) {
            OverlayTxt.classList.remove('hide');

            var height = Overlay.clientHeight / 2 - OverlayTxt.clientHeight;
            OverlayTxt.style.marginTop = height + 'px';
        } else {
            OverlayTxt.classList.add('hide');
        }
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

                    if (from == 'regular-buttons') {
                        document.getElementById(from).removeChild(document.getElementById(el));
                        node = document.importNode(win.document.getElementById(el), true);
                        CACHE.ADD_NEW_THING.insertAdjacentElement('beforebegin', node);

                        Core.setAlbumEvents();
                    } else {
                        document.getElementById(from).removeChild(document.getElementById(el));
                        node = document.importNode(win.document.getElementById(el), true);
                        document.getElementById(from).appendChild(node);
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

        if (localStorage['authInfo'] != undefined && localStorage['authInfo'] != '') {
            Core.audioEvent();

            Core.setElements.search();

            if (win.LastActiveIndex) {
                LastActiveIndex = win.LastActiveIndex;
            }

            if (!CONST.PAGE_RELOADED && !MF_INIT) {
                MFCore.init();
            }

            if (!isElements && !isEvents) {
                Core.setElements.all();

                Core.setEvents();

                isElements = true;
                isEvents = true;
            }

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
    var songList = CACHE.SEARCH.value.length > 0 || CONST.REC_ACTIVE ? CACHE.SEARCH_SONGS_LIST : AudioList,
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
 * @param {Event} e
 */
Core.openRbList = function (e) {
    this.classList.toggle('active');

    var list = this.getElementsByClassName('r-list')[0];

    if (list.classList.contains('opened')) {
        list.removeAttribute('style');
        list.classList.remove('opened');
    } else {
        var topVal = list.clientHeight - 1;
        list.style.top = '-' + topVal.toString() + 'px';
        list.classList.add('opened');
    }
};

/**
 * Show all user albums
 *
 * @param {Event} e
 */
Core.openAlbums = function (e) {
    this.classList.toggle('active');

    var list = this.getElementsByClassName('r-list')[0];

    if (list.classList.contains('opened')) {
        list.removeAttribute('style');
        list.classList.remove('opened');
    } else {
        var topVal = list.clientHeight - 1;
        list.style.top = '-' + topVal.toString() + 'px';
        list.classList.add('opened');
    }
};

Core.eraseSearchInput = function () {
    CACHE.SEARCH.value = '';
    CACHE.EMPTY_SEARCH.classList.remove('show');

    if (!AudioList && !CACHE.SEARCH_LIST) {
        CACHE.EMPTY_LIST.classList.add('show');
    }

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

    CurrentUser.removeChild(CurrentUser.getElementsByClassName('user')[0]);
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
            if (!e.target.classList.contains('remove-album')) {
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
            }
        });
    }

    var removeAlbums = document.getElementsByClassName('remove-album');

    for (var i = 0, size = removeAlbums.length; i < size; i++) {
        removeAlbums[i].addEventListener('click', function () {
            Core.showOverlay();
            Core.setBlur('songs-list');

            Core.event.send({
                event: 'removeAlbum',
                data: this.getAttribute('data-id')
            })
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

    if (AudioList) {
        AudioList.classList.remove('hide');
    }

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
    if (CACHE.SONGS_LIST) {
        CACHE.SONGS_LIST.classList.add('hide');
    }

    if (AudioList) {
        AudioList.classList.add('hide');
    }

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

/**
 * Activate search by key
 *
 * @param {Event} e
 */
Core.searchInputKeysEvents = function (e) {
    if (e.keyCode == 13) {
        Core.audioSearch();
    }
};

Core.addNewAlbum = function () {
    Core.showOverlay(false, true);
    Core.setBlur('songs-list');
    CACHE.ADD_ALBUM_WRAPPER.classList.add('show');
};

Core.closeWindowBox = function () {
    Core.closeWBox(this.parentNode);
};

Core.closeWBox = function (windowBox) {
    var boxInputs = windowBox.getElementsByTagName('input');

    windowBox.classList.remove('show');
    Core.removeBlur('songs-list');
    Core.hideOverlay();

    for (var i = 0, size = boxInputs.length; i < size; i++) {
        boxInputs[i].value = '';
    }
};

Core.saveAlbumAction = function (e) {
    e.preventDefault();

    Core.event.send({
        event: 'createNewAlbum',
        data: CACHE.NEW_ALBUM.value
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
    ShuffleSongs.addEventListener('click', Core.shuffleSongs);
    Broadcast.addEventListener('click', Core.broadcastSong);
    Core.setAudioSearchConfigsEvents();
    CACHE.ADD_NEW_ALBUM.addEventListener('click', Core.addNewAlbum);
    document.addEventListener('click', Core.trackActiveElements);

    var rb1 = document.getElementsByClassName('rb-1');

    for (var i = 0, size = rb1.length; i < size; i++) {
        rb1[i].addEventListener('click', Core.openRbList);
    }

    var boxClose = document.getElementsByClassName('box-close');

    for (var i = 0, size = boxClose.length; i < size; i++) {
        boxClose[i].addEventListener('click', Core.closeWindowBox);
    }

    CACHE.SAVE_ALBUM_FORM.addEventListener('submit', Core.saveAlbumAction);
};

Core.setAlbumEvents = function () {
    Core.setElements.all();
    Core.allAlbumsEvents();
    CACHE.ALBUMS.addEventListener('click', Core.openAlbums);
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

        if (!AudioList) {
            CACHE.EMPTY_LIST.classList.add('show');
        }

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

    CACHE.REC_OVERLAY.addEventListener('click', Core.removeRecState);
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
        CACHE.ADD_NEW_THING = document.getElementById('add-new-thing');
        CACHE.ADD_NEW_ALBUM = document.getElementById('add-new-album');
        CACHE.ADD_ALBUM_WRAPPER = document.getElementById('add-album-wrapper');
        CACHE.SAVE_ALBUM_FORM = document.getElementById('save-album');
        CACHE.NEW_ALBUM = document.getElementById('new-album');
        CACHE.ALBUMS = document.getElementById('albums');
        CACHE.REGULAR_BUTTONS = document.getElementById('regular-buttons');
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
        CACHE.REC_OVERLAY = document.getElementById('rec-overlay');
        CACHE.EMPTY_SEARCH = document.getElementById('empty-search');
        CACHE.EMPTY_LIST = document.getElementById('empty-list');
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
    var i = element.childNodes.length;

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