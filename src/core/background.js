var APP_VERSION = localStorage['statusAc'];


chrome.browserAction.setBadgeBackgroundColor({color: '#45658b'});

var
    AuthBlock,
    PlayerWrapperBG,
    MFPlayer,
    Songs = {},
    LastActive,
    LastActiveIndex,
    Port,
    FirstSong = {},
    FirstLoad = true,
    ConnectStatus = false,
    DataListen = false,
    RepeatSong = false,
    CurrentSong = {},
    LastVolume = 0,
    EmptyList,
    RepeatSongEl,
    AlbumID = '',
    ShuffleSongs = false,
    BroadcastStatus = false,
    ShuffleSongsEl,
    SongsCount = 0,
    Broadcast,
    divCache = document.createElement('div'),
    listCache = document.createElement('ul'),
    liCache = document.createElement('li'),
    spanCache = document.createElement('span'),
    aCache = document.createElement('a'),
    imgCache = document.createElement('img'),
    iCache = document.createElement('i'),
    LAST_EMPTY = false,
    CONST = {
        PAGE_RELOADED: false
    },
    CACHE = {
        SONGS_STATE_CHANGE: false
    };

//track hot keys
chrome.commands.onCommand.addListener(function (command) {
    if (command == 'Play') {
        if (!CONST.PAGE_RELOADED && MFCore.isFirstSongPlayed()) {
            BG.event.sendPlay();
        } else {
            if (Songs[CACHE.SONGS_STATE] != undefined) {
                if (MFCore.isFirstSongPlayed()) {
                    if (!ConnectStatus) {
                        BG.setNotification({
                            type: 'basic',
                            title: CurrentSong.title.trim() + ' ' + CurrentSong.realDuration,
                            message: CurrentSong.artist,
                            iconUrl: '/app-icon.png'
                        });
                    }
                }

                BG.event.setToPause();
            } else if (CurrentSong.id != undefined && MFCore.isInPlayStatus()) {
                BG.event.setToPause();
            } else {
                BG.setNotification({
                    type: 'basic',
                    title: chrome.i18n.getMessage('songNotFound'),
                    message: chrome.i18n.getMessage('noSongs'),
                    iconUrl: '/images/sad-face.png'
                });
            }
        }
    } else if (command == 'Next') {
        BG.event.playNext(true);
    } else if (command == 'Prev') {
        BG.event.playPrev();
    } else if (command == 'Repeat') {
        BG.event.setRepeatSong();
    }
});

/**
 * Background main object
 *
 * @type {object}
 */
var BG = {};

/**
 * Chrome Browser Action Wrapper
 *
 * @type {{setIcon: {pause: Function, play: Function}, setTitle: Function, showBadgeInfo: Function}}
 */
BG.browserAction = {
    disable: function () {
        chrome.browserAction.setPopup({popup: ''});
    },
    enable: function () {
        chrome.browserAction.setPopup({popup: '/templates/window.html'});
    },
    setIcon: {
        pause: function () {
            chrome.browserAction.setIcon({path: {'19': '/images/pause-icon.png', '38': '/images/pause-icon.png'}});
        },
        play: function () {
            chrome.browserAction.setIcon({path: {'19': '/images/play-icon.png', '38': '/images/play-icon.png'}});
        },
        update: function () {
            chrome.browserAction.setIcon({path: {'19': '/images/update_icon.png', '38': '/images/update_icon.png'}});
        },
        autoIcon: function () {
            if (BG.isPlay()) {
                BG.browserAction.setIcon.pause();
            } else {
                BG.browserAction.setIcon.play();
            }
        }
    },
    setTitle: function (title) {
        chrome.browserAction.setTitle({title: title});
    },
    showBadgeInfo: function () {
        if (ShowSongsOnBadge == 'true' && ShowSongDurationOnBadge == 'false') {
            chrome.browserAction.setBadgeText({text: SongsCount.toString()});
        } else if (ShowSongDurationOnBadge == 'true' && ShowSongsOnBadge == 'false') {
            if (SongCurrentDuration == '0:00') {
                chrome.browserAction.setBadgeText({text: '0:00'});
            } else {
                chrome.browserAction.setBadgeText({text: SongCurrentDuration});
            }
        }
    }
};

BG.checkForAuth = function () {
    if (localStorage['authInfo'] != undefined && localStorage['authInfo'] != '' && (localStorage['statusAc'] != undefined && localStorage['statusAc'] != '' && localStorage['statusAc'] != 'false')) {
        AuthBlock.style.display = 'none';
        PlayerWrapperBG.style.display = 'block';
        MFCore.init();

        BG.browserAction.disable();
        BG.browserAction.setIcon.update();

        BG.getAllAudio(function () {
            BG.browserAction.enable();
            BG.browserAction.setIcon.autoIcon();

        }, false, 1, false, true, {});
        BG.setSearchType();
    } else {
        PlayerWrapperBG.style.display = 'none';
        BG.event.openAuth();
    }
};

/**
 * Init dom elements
 */
BG.elements = function () {
    AuthBlock = document.getElementById('auth-block');
    PlayerWrapperBG = document.getElementById('player-wrapper');
    MFPlayer = new Audio();
    EmptyList = document.getElementById('empty-list');
    RepeatSongEl = document.getElementById('repeat-song');
    ShuffleSongsEl = document.getElementById('shuffle-play');
    Broadcast = document.getElementById('broadcast');
    CACHE.SONGS_LIST = document.getElementById('songs-list');
    CACHE.SEARCH_LIST = document.getElementById('search-list');
    CACHE.EMPTY_SEARCH = document.getElementById('empty-search');
    CACHE.SEARCH = document.getElementById('search');
    CACHE.SEARCH_TYPES_LIST = document.getElementById('types-list');
    CACHE.SEARCH_SELECT_TYPES = document.getElementsByClassName('search-select-type');
    CACHE.REC_OVERLAY = document.getElementById('rec-overlay');
    CACHE.SONG_SEARCH_TYPE = document.getElementById('song-search-type');
    CACHE.AUDIO_SEARCH_TYPE = document.getElementById('audio-search-type');
    CACHE.LYRICS_CHECKBOX = document.getElementById('lyrics');
    CACHE.LYRICS_CHECKBOX_LABEL = document.querySelector('#lyrics-checkbox-wrapper label');
    CACHE.LYRICS_CLICK_OVERLAY = document.querySelector('#lyrics-checkbox-wrapper .click-overlay');
};

/**
 * Check if player in action
 *
 * @returns {boolean}
 */
BG.isPlay = function () {
    return !MFPlayer.paused && !MFPlayer.ended && 0 < MFPlayer.currentTime;
};

/**
 * Load all user audio
 *
 * @param {function} callback
 * @param {boolean} type
 * @param {string} api
 * @param {string|number} albumID
 * @param {boolean} noFirst
 * @param {object} obj
 */
BG.getAllAudio = function (callback, type, api, albumID, noFirst, obj) {
    BG.getUsersList();

    if (!BG.isPlay()) {
        BG.browserAction.showBadgeInfo();
    }
    var userID = VKit.getActiveAccount();

    BG.getData(api, {userID: userID, albumID: albumID}, function (response) {
        var jsonData = JSON.parse(response).response;
        BG.renderAudioList(jsonData, type, noFirst, obj, callback);
        BG.renderAlbums(userID, albumID, jsonData.albumsList.items);
    });
};

BG.renderAlbums = function (userID, albumID, Albums, callback) {
    var AlbumList = document.getElementById('album-list'),
        allSongs = divCache.cloneNode(false),
        currUserID = JSON.parse(localStorage['authInfo']).userID;

    BG.clearElement(AlbumList);

    if (Albums != undefined) {
        if (!albumID)
            allSongs.className = 'active';

        allSongs.textContent = chrome.i18n.getMessage('allSongs');
        allSongs.setAttribute('data-id', 'null');
        AlbumList.appendChild(allSongs);

        console.log(Albums);

        for (var i = 1, size = Albums.length; i < size; i++) {
            var data = Albums[i],
                album = divCache.cloneNode(false);

            if (albumID && data.id == albumID) {
                album.className = 'active';
            }

            album.textContent = data.title;
            album.title = data.title;
            album.setAttribute('data-id', data.id);

            if (currUserID == userID) {
                var removeAlbum = spanCache.cloneNode(false);
                removeAlbum.className = 'fa fa-trash-o remove-album';
                removeAlbum.title = chrome.i18n.getMessage('delete');
                removeAlbum.setAttribute('data-id', data.id);

                album.appendChild(removeAlbum);
            }

            AlbumList.appendChild(album);
        }
    }

    if (callback && typeof callback == 'function') {
        callback();
    }

};

/**
 * Check if we in search state
 *
 * @returns {boolean}
 */
BG.checkForSearchState = function () {
    return CACHE.SEARCH.value.length > 0;
};

/**
 * Render audio list
 *
 * @param {Object} response
 * @param {Boolean} type
 * @param {Boolean} noFirst
 * @param {Object} obj
 * @param {Function} callback
 */
BG.renderAudioList = function (response, type, noFirst, obj, callback) {
    var isSearch = typeof obj == 'object' && obj.recState ? obj.recState : BG.checkForSearchState(),
        oldList,
        searchEl = document.getElementById('search-list'),
        audioEl = document.getElementById('audio-list') || undefined,
        currUserID = JSON.parse(localStorage['authInfo']).userID;

    BG.setStates(isSearch ? 'search' : 'audio');

    Songs[CACHE.SONGS_STATE] = response.audioList || undefined;

    if (isSearch) {
        oldList = document.getElementById('search-list') || undefined;

        if (audioEl) {
            audioEl.classList.add('hide');
        }
    } else {
        oldList = document.getElementById('audio-list') || undefined;

        if (searchEl) {
            searchEl.classList.add('hide');
        }
    }

    if (oldList) {
        CACHE.SONGS_LIST.removeChild(oldList);
    }

    var list = listCache.cloneNode(false),
        listID = isSearch ? 'search-list' : 'audio-list';

    list.setAttribute('id', listID);

    if (Songs[CACHE.SONGS_STATE] && Songs[CACHE.SONGS_STATE].count > 0 && Songs[CACHE.SONGS_STATE][0] != 0 && !type) {
        var albumsListEl = listCache.cloneNode(false);

        console.log(response.userAlbumsList);
        if (response.userAlbumsList.items.length > 0) {
            var albumsArr = response.userAlbumsList.items;

            console.log(albumsArr,'ooook');
            for (var i = 1, size = albumsArr.length; i < size; i++) {
                var album = albumsArr[i],
                    li = liCache.cloneNode(false),
                    title = divCache.cloneNode(false),
                    loading = divCache.cloneNode(false),
                    success = divCache.cloneNode(false),
                    successIcon = iCache.cloneNode(false);

                title.className = 'albumTitle';
                loading.className = 'loading';
                success.className = 'added-to-album';
                successIcon.className = 'fa fa-check';

                title.title = album.title;
                title.textContent = album.title;

                success.textContent = chrome.i18n.getMessage('added');
                success.appendChild(successIcon);

                li.appendChild(title);
                li.appendChild(loading);
                li.appendChild(success);

                li.setAttribute('data-id', album.id);

                albumsListEl.appendChild(li);
            }
        }

        for (var i = 1, size = Songs[CACHE.SONGS_STATE].items.length; i < size; i++) {
            var li = liCache.cloneNode(false),
                name = spanCache.cloneNode(false),
                splitter = spanCache.cloneNode(false),
                artist = spanCache.cloneNode(false),
                duration = spanCache.cloneNode(false),
                addTo = spanCache.cloneNode(false),
                saveSong = aCache.cloneNode(false),
                recSongs = spanCache.cloneNode(false),
                removeSong = spanCache.cloneNode(false),
                removeFromAlbum = spanCache.cloneNode(false),
                actions = spanCache.cloneNode(false),
                index = i.toString(),
                addList = listCache.cloneNode(false),
                addToMyAudio = liCache.cloneNode(false),
                addToMyAudioIconList = iCache.cloneNode(false),
                alreadyAddedIcon = iCache.cloneNode(false),
                loadIcon = iCache.cloneNode(false),
                addToAlbums = liCache.cloneNode(false),
                addToAlbumsCaret = iCache.cloneNode(false),
                albumsList = divCache.cloneNode(false),
                postOnWall = liCache.cloneNode(false),
                postOnWallIcon = iCache.cloneNode(false),
                sureOverlay = divCache.cloneNode(false),
                sureText = spanCache.cloneNode(false),
                sureYes = spanCache.cloneNode(false),
                sureNo = spanCache.cloneNode(false);

            /**
             * Audio object
             *
             * @type {{aid: number, artist: string, duration: number, genre: number, lyrics_id: number, owner_id: number, title: string, url: string}}
             */
            var audio = Songs[CACHE.SONGS_STATE].items[i];

            //set content
            name.textContent = audio.title;
            name.title = audio.title;
            artist.textContent = audio.artist;
            artist.title = audio.artist;
            duration.textContent = VKit.util.secToMin(audio.duration);

            //set class
            name.className = 'title';
            splitter.className = 'splitter';
            artist.className = 'artist';
            duration.className = 'duration';
            actions.className = 'actions';

            recSongs.className = 'fa fa-headphones show-rec-songs';
            addTo.className = 'fa fa-plus add-to';
            saveSong.className = 'fa fa-floppy-o save-song';
            removeSong.className = 'fa fa-times remove-song';
            removeFromAlbum.className = 'fa fa-chain-broken remove-from-album';
            loadIcon.className = 'load-icon';
            sureOverlay.className = 'sure-overlay';
            sureText.className = 'sure-text';
            sureYes.className = 'regular-button yes-remove';
            sureNo.className = 'regular-button no-remove';

            //add to
            addList.className = 'add-to-list';
            var isCurrUser = audio.owner_id != currUserID;

            if (isCurrUser) {
                addToMyAudio.className = 'add-to-my-audio-list';

                addToMyAudio.textContent = chrome.i18n.getMessage('addToMyAudioList');
                addToMyAudio.setAttribute('data-arr', audio.id + ',' + audio.owner_id);
                addToMyAudio.appendChild(addToMyAudioIconList);
                addToMyAudio.appendChild(alreadyAddedIcon);
                addToMyAudio.appendChild(loadIcon);
                addList.appendChild(addToMyAudio);
            }

            addToAlbumsCaret.className = 'fa fa-caret-left';
            albumsList.className = 'sub-menu';

            addToMyAudioIconList.className = 'fa fa-plus-square audio-list-icon';
            alreadyAddedIcon.className = 'fa fa-check already-added';
            addToAlbums.className = 'add-to-album-show has-sub-menu';

            postOnWall.className = 'post-on-wall';
            postOnWall.title = chrome.i18n.getMessage('shareSong');
            postOnWall.setAttribute('data-arr', audio.owner_id + '_' + audio.id);
            postOnWallIcon.className = 'fa fa-bullhorn post-on-wall-icon';
            postOnWall.textContent = postOnWall.title;
            postOnWall.appendChild(postOnWallIcon);
            postOnWall.appendChild(alreadyAddedIcon.cloneNode(true));
            postOnWall.appendChild(loadIcon.cloneNode(true));

            addToAlbums.textContent = chrome.i18n.getMessage('addToAlbum');
            addToAlbums.setAttribute('data-arr', audio.id + ',' + audio.owner_id + ',' + isCurrUser.toString());
            addToAlbums.appendChild(addToAlbumsCaret);

            if (albumsArr && albumsArr[0] && albumsArr[0] == 0) {
                albumsList.classList.add('empty-list');
                albumsList.textContent = chrome.i18n.getMessage('albumsListIsEmpty');
            } else {
                albumsList.appendChild(albumsListEl.cloneNode(true));
            }

            addToAlbums.appendChild(albumsList);
            addList.appendChild(addToAlbums);
            addList.appendChild(postOnWall);
            addTo.appendChild(addList);

            if (CurrentSong.id == audio.id) {
                if (MFPlayer.buffered.length != 0) {
                    li.classList.add('active');
                }
            }

            recSongs.title = chrome.i18n.getMessage('recommendations');
            recSongs.setAttribute('data-id', audio.owner_id + '_' + audio.id);

            saveSong.href = audio.url;
            var songName = audio.artist + ' - ' + audio.title + '.mp3';
            saveSong.title = chrome.i18n.getMessage('download') + ' ' + songName;
            saveSong.download = songName;

            if (isSearch) {
                if (audio.owner_id == currUserID) {
                    var userSong = spanCache.cloneNode(false),
                        userSongWrapper = spanCache.cloneNode(false);

                    userSong.className = 'fa fa-check-circle song-in-list';
                    userSong.title = songName + ' ' + chrome.i18n.getMessage('alreadyInList');
                    userSongWrapper.className = 'sil-wrapper';

                    userSongWrapper.appendChild(userSong);
                    li.appendChild(userSongWrapper);
                }
            }

            removeSong.title = chrome.i18n.getMessage('remove');
            removeFromAlbum.title = chrome.i18n.getMessage('removeFromAlbum');

            actions.appendChild(addTo);
            actions.appendChild(recSongs);
            actions.appendChild(saveSong);

            if (VKit.getActiveAccount() == currUserID && !isSearch) {
                actions.appendChild(removeSong);

                if (AlbumID != undefined && AlbumID != '') {
                    actions.appendChild(removeFromAlbum);
                }
            }

            sureText.textContent = chrome.i18n.getMessage('areYouSure');
            sureYes.textContent = chrome.i18n.getMessage('yes');
            sureNo.textContent = chrome.i18n.getMessage('no');

            sureOverlay.appendChild(sureText);
            sureOverlay.appendChild(sureYes);
            sureOverlay.appendChild(sureNo);

            li.classList.add('main-song-wrapper');

            li.appendChild(artist);
            li.appendChild(splitter);
            li.appendChild(name);
            li.appendChild(duration);
            li.appendChild(actions);
            li.appendChild(sureOverlay);

            li.setAttribute('data-aid', audio.id);
            li.setAttribute('data-index', index);
            li.setAttribute('data-list', listID);

            if (!isSearch) {
                SongsCount = index;

                BG.browserAction.showBadgeInfo();
            }

            list.appendChild(li);
        }

        BG.browserAction.showBadgeInfo();
        if (ShowSongsOnBadge == 'false' && ShowSongDurationOnBadge == 'true') {
            chrome.browserAction.setBadgeText({text: SongCurrentDuration});
        }

        EmptyList.classList.remove('show');

        if (!isSearch) {
            EmptyList.classList.remove('show');
            PlayerWrapperBG.style.display = 'block';
        }

        CACHE.SONGS_LIST.insertAdjacentElement('afterBegin', list);

        if (noFirst) {
            BG.setFirstSong();
        }

        if (!isSearch) {
            CONST.PAGE_RELOADED = true;

            BG.event.send({
                event: 'setPageReloadState',
                data: CONST.PAGE_RELOADED
            });

            if (!LAST_EMPTY) {
                BG.getSongsStateChange(false);
            }

            LAST_EMPTY = false;

            BG.event.send({
                event: 'reloadContent',
                data: 'album-list'
            });
        }
    } else {
        if (isSearch) {

            var noResults = divCache.cloneNode(false);
            noResults.textContent = chrome.i18n.getMessage('nothingFound');
            noResults.className = 'nothing-found';

            list.appendChild(noResults);
            CACHE.SONGS_LIST.appendChild(list);
            EmptyList.classList.remove('show');

        } else {
            EmptyList.classList.add('show');
            LAST_EMPTY = true;

            CONST.PAGE_RELOADED = true;

            BG.event.send({
                event: 'setPageReloadState',
                data: CONST.PAGE_RELOADED
            });

            BG.event.send({
                event: 'reloadContent',
                data: 'album-list'
            });
        }
    }

    if (callback && typeof callback == 'function') {
        callback();
    }

};

BG.getUsersList = function () {
    var usersInfo = VKit.getUserInfo(),
        img = imgCache.cloneNode(false),
        div = divCache.cloneNode(false),
        activeUser = document.getElementById('current-user'),
        allUsers = document.getElementById('all-users');

    BG.clearElement(activeUser);
    BG.clearElement(allUsers);

    for (var i in usersInfo) {
        var user = usersInfo[i],
            name = div.cloneNode(false),
            userWrapper = div.cloneNode(false),
            photo = img.cloneNode(false),
            userFullName = user.firstName + ' ' + user.lastName;

        photo.src = user.photo;
        name.textContent = userFullName;
        name.title = userFullName;

        photo.className = 'user-photo';
        name.className = 'user-name';

        userWrapper.className = 'user r-title';
        userWrapper.setAttribute('data-id', user.id);

        userWrapper.appendChild(photo);
        userWrapper.appendChild(name);

        if (VKit.getActiveAccount() == user.id) {
            var uw = userWrapper.cloneNode(true);
            activeUser.appendChild(userWrapper);

            uw.className += ' active';
            allUsers.appendChild(uw);
        } else {
            allUsers.appendChild(userWrapper);
        }
    }
};

BG.clearElement = function (element) {
    var i = element.childNodes.length;

    while (--i >= 0)
        element.removeChild(element.firstChild);
};

BG.setActiveSong = function (index) {
    if (CurrentSong.owner_id == VKit.getActiveAccount() && CurrentSong.albumID == AlbumID) {
        var eIndex = index - 1,
            e = document.getElementById('player-wrapper').getElementsByTagName('li')[eIndex];

        if (LastActive)
            LastActive.classList.remove('active');

        e.classList.add('active');
        LastActive = e;
        LastActiveIndex = eIndex;
    }
};

/**
 * Events
 *
 * @type {object}
 */
BG.event = {};

/**
 * Create connection
 */
BG.event.connect = function () {
    Port = chrome.runtime.connect({name: 'bg'});

    Port.onDisconnect.addListener(function (e) {
        ConnectStatus = false;
    });
};

/**
 * Listen for data
 */
BG.event.listenData = function () {
    if (!DataListen) {
        chrome.runtime.onConnect.addListener(function (port) {
            DataListen = true;
            BG.event.connect();

            if (port.name == 'content' || port.name == 'settings')
                ConnectStatus = false;
            else
                ConnectStatus = true;

            port.onMessage.addListener(function (msg) {
                console.log(msg);
                BG.event[msg.event](msg.data);
            });
        });
    }
};

/**
 * Send data
 * @param {object} data
 */
BG.event.send = function (data) {
    if (ConnectStatus)
        Port.postMessage(data);
};

BG.event.checkPlayed = function (data) {
    if (MFPlayer.src == '') {
        if (LastActiveIndex)
            Core.removeActiveIndex(LastActiveIndex);

        if (LastActive)
            LastActive.className = '';

        var element = document.getElementById('player-wrapper').getElementsByTagName('li')[0],
            index = element.getAttribute('data-index');

        LastActive = element;

        MFCore.set(Songs[CACHE.SONGS_STATE].items[index].url, Songs[CACHE.SONGS_STATE].items[index].duration);
    }
};

/**
 * Play song
 *
 * @param {object} data
 */
BG.event.sendPlay = function (data) {
    BG.setSongsStateChange(false);
    BG.event.playByIndex(LastActiveIndex);
};

BG.event.checkFirstLoad = function (data) {
    if (FirstLoad) {
        BG.event.send({
            event: 'setFirstLoadToTrue',
            data: true
        });

        FirstLoad = false;
    } else {
        BG.event.send({
            event: 'setFirstLoadToFalse',
            data: false
        });

        FirstLoad = false;
    }
};

BG.event.mute = function () {
    LastVolume = MFPlayer.volume ? MFPlayer.volume : 1;
    MFPlayer.volume = 0;
};

BG.event.unmute = function () {
    MFPlayer.volume = LastVolume;
};

BG.event.setToPause = function (data) {
    if (MFPlayer.paused) {
        BG.event.setToPlay();
    } else {
        MFPlayer.pause();
        MFPlay.classList.remove('pause');

        BG.browserAction.setIcon.play();

        BG.event.send({
            event: 'changePauseToPlay',
            data: ''
        });
    }
};

BG.event.setToPlay = function (data) {
    if (CurrentSong.id != undefined) {
        if (MFCore.isFirstSongPlayed()) {
            BG.event.sendPlay();
        } else {
            BG.setToPlay();
        }
    } else if (LastActiveIndex == undefined && Songs[CACHE.SONGS_STATE] != undefined) {
        LastActiveIndex = {
            index: 1
        };
        FirstLoad = true;
        BG.setSongsStateChange(false);
        BG.event.sendPlay();
    } else if (LastActiveIndex != undefined && LAST_EMPTY) {
        FirstLoad = true;
        BG.setSongsStateChange(false);
        BG.setToPlay();
    }
};

BG.event.playNext = function (data) {
    BG.browserAction.showBadgeInfo();

    if (data) {
        MFCore.playNext(data);
    } else {
        MFCore.playNext();
    }
};

BG.event.playPrev = function (data) {
    BG.browserAction.showBadgeInfo();
    MFCore.playPrev();
};

/**
 * Play song by index
 *
 * @param {{index: number, aid: number}} data
 */
BG.event.playByIndex = function (data) {
    if (Songs[CACHE.SONGS_STATE] != undefined || CurrentSong != undefined) {
        MFCore.nullSongCurrentDuration();
        MFPlayer.pause();
        MFProgress.style.width = 0;

        BG.browserAction.showBadgeInfo();

        if (typeof(MFPlayer.ontimeupdate) != 'function') {
            MFCore.events();
        }

        if (Songs[CACHE.SONGS_STATE] == undefined || (Songs[CACHE.SONGS_STATE].items.length == 1 && Songs[CACHE.SONGS_STATE][0] == 0)) {
            var song = CurrentSong;
        } else {
            var song = Songs[CACHE.SONGS_STATE].items[data.index];
        }


        if (data.id == undefined) {
            data.id = song.id;
        }

        MFDuration = song.duration;
        MFPlayer.src = song.url;
        MFPlayer.play();

        if (!MFPlay.classList.contains('pause')) {
            MFPlay.className += ' pause';
        }

        if (data != undefined) {
            BG.setActiveByIndex(data.id);

            var tempEl = document.querySelector('#songs-list li[data-aid="' + data.id + '"]');

            if (LastActive && tempEl && LastActive.getAttribute('data-aid') != tempEl.getAttribute('data-aid')) {

                BG.removeActiveIndex(LastActiveIndex.id);
            }

            BG.setLastActive(data.id);

            if (LastActiveIndex == undefined) {
                LastActiveIndex = {
                    index: data.index,
                    id: data.id
                };
            }
        }

        if (LastActiveIndex != undefined && Songs[CACHE.SONGS_STATE] != undefined) {
            BG.event.send({
                event: 'setNewHighLightElement',
                data: {
                    oldIndex: LastActiveIndex.id,
                    newIndex: data.id
                }
            });
        }

        if (data != undefined) {
            LastActiveIndex = {
                index: data.index,
                id: data.id
            };
        }

        CurrentSong = {
            aid: song.id,
            id: song.id,
            artist: song.artist,
            title: song.title,
            duration: song.duration,
            realDuration: VKit.util.secToMin(MFDuration),
            index: data.index,
            owner_id: song.owner_id,
            albumID: AlbumID,
            url: song.url
        };

        var songTitle = CurrentSong.artist + ' - ' + CurrentSong.title;

        BG.setSongInfo(CurrentSong.artist, CurrentSong.title, CurrentSong.realDuration);
        BG.browserAction.setIcon.pause();
        BG.browserAction.setTitle(songTitle);

        BG.event.send({
            event: 'changeSongInfo',
            data: CurrentSong
        });

        BG.event.send({
            event: 'changePlayToPause',
            data: ''
        });

        BG.event.send({
            event: 'setFirstLoadToFalse',
            data: false
        });

        if (BroadcastStatus) {
            VKit.api('audio.setBroadcast', ['audio=' + CurrentSong.owner_id + '_' + CurrentSong.id], function (response) {
            });
        }

        FirstLoad = false;
    } else {
        if (!ConnectStatus) {
            BG.setNotification({
                type: 'basic',
                title: chrome.i18n.getMessage('songNotFound'),
                message: chrome.i18n.getMessage('noSongs'),
                iconUrl: '/images/sad-face.png'
            });
        }
    }
};

BG.event.getSongDuration = function () {
    BG.event.send({
        event: 'setSongDuration',
        data: {
            dur: CurrentSong.duration,
            index: CurrentSong.id
        }
    });
};

BG.event.setRepeatSong = function (data) {
    if (RepeatSong) {
        RepeatSong = false;
        RepeatSongEl.classList.remove('active');

        BG.event.send({
            event: 'setNonActiveRepeat',
            data: ''
        });
    } else {
        RepeatSong = true;
        RepeatSongEl.classList.add('active');

        BG.event.send({
            event: 'setActiveRepeat',
            data: ''
        });
    }
};

/**
 * Change current song time
 *
 * @param {number} data
 */
BG.event.changeCurrentTime = function (data) {
    if (MFPlayer.src != '') {
        MFPlayer.pause();
        MFPlayer.currentTime = data;
        BG.event.setToPlay();
    }
};

/**
 * Change volume
 *
 * @param {object} data
 */
BG.event.changeVolume = function (data) {
    MFVolume.value = data.volumeValue;
    MFPlayer.volume = data.volume;
    MFVolumeLine.style.width = data.volumeWidth;
};

/**
 * First app load
 */
BG.event.firstLoad = function () {
    if (FirstLoad == false) {
        BG.event.send({
            event: 'firstLoad',
            data: {
                firstLoad: 'true',
                song: FirstSong
            }
        });

        FirstLoad = false;
    }
};


BG.event.sendFirstLoad = function () {
    BG.event.firstLoad();
};

/**
 * Update audio list
 *
 * @param {object} data
 * @param {Function} callback
 */
BG.event.updateList = function (data, callback, userUpdate) {
    BG.browserAction.disable();
    BG.browserAction.setIcon.update();
    BG.event.clearSearchInput();

    CACHE.REC_OVERLAY.classList.remove('show');

    var searchList = document.getElementById('search-list');

    if (searchList) {
        BG.clearElement(searchList);
    }

    if (AlbumID) {
        BG.getAllAudio(function () {
            BG.browserAction.enable();
            BG.browserAction.setIcon.autoIcon();

            BG.event.send({
                event: 'reloadContent',
                data: ''
            });

            if (callback && typeof callback == 'function') {
                callback();
            }
        }, false, 2, AlbumID, false);
    } else {
        BG.getAllAudio(function () {
            BG.event.send({
                event: 'setSongDuration',
                date: CurrentSong.realDuration
            });

            var sendMsg = userUpdate || '';

            BG.browserAction.enable();
            BG.browserAction.setIcon.autoIcon();

            BG.event.send({
                event: 'reloadContent',
                data: sendMsg
            });

            if (callback && typeof callback == 'function') {
                callback();
            }
        }, false, 1, false, false);
    }
};

BG.event.openAuth = function (data) {
    VKit.openAuthWindow(function () {
    });
};

BG.event.setActiveUser = function (data) {
    VKit.setActiveAccount(data);

    AlbumID = undefined;

    BG.browserAction.disable();
    BG.browserAction.setIcon.update();

    BG.getAllAudio(function () {
        if (!BG.isPlay()) {
            BG.browserAction.showBadgeInfo();
        }

        BG.browserAction.enable();
        BG.browserAction.setIcon.autoIcon();

        BG.event.send({
            event: 'setActiveCoreUser',
            data: {
                id: data
            }
        });

        BG.event.send({
            event: 'reloadContent',
            data: {
                removeSearchAjax: true
            }
        });
    }, false, 1, false, false, {userChecked: true});

    document.getElementById('album-title').textContent = chrome.i18n.getMessage('albums');

    Port.postMessage({
        event: 'updateSettingsView',
        data: ''
    });
};

BG.event.updateUsersList = function (data) {
    BG.getUsersList();
};

BG.event.openPlayer = function (data) {
    var url = chrome.runtime.getURL('/templates/window.html');
    window.open(url, 'new', 'width=420,height=555,toolbar=0');
};

BG.event.loadAlbum = function (data, callback) {
    var sendMsg = '';

    if (data.id == undefined) {
        AlbumID = data.id;
        sendMsg = 'first';
    } else {
        AlbumID = data.id;
        sendMsg = data.id;
    }

    document.getElementById('album-title').textContent = data.title == chrome.i18n.getMessage('allSongs') ? chrome.i18n.getMessage('albums') : data.title;

    BG.event.updateList(null, function () {
        BG.event.send({
            event: 'setActiveAlbum',
            data: {
                id: sendMsg
            }
        });

        if (callback && typeof callback == 'function') {
            callback();
        }
    });
};

BG.event.setShuffleSongs = function (data) {
    if (ShuffleSongs) {
        ShuffleSongs = false;
        ShuffleSongsEl.classList.remove('active');

        BG.event.send({
            event: 'setShuffleToDisable',
            data: ''
        });
    } else {
        ShuffleSongs = true;
        ShuffleSongsEl.classList.add('active');

        BG.event.send({
            event: 'setShuffleToActive',
            data: ''
        });
    }
};

BG.event.setBroadcastSong = function (data) {
    if (BroadcastStatus) {
        BroadcastStatus = false;
        Broadcast.classList.remove('active');

        VKit.api('audio.setBroadcast', [''], function (response) {
            BG.event.send({
                event: 'setBroadcastToDisable',
                data: ''
            });
        });
    } else {
        BroadcastStatus = true;
        Broadcast.classList.add('active');

        VKit.api('audio.setBroadcast', ['audio=' + CurrentSong.owner_id + '_' + CurrentSong.id], function (response) {
            BG.event.send({
                event: 'setBroadcastToActive',
                data: ''
            });
        });
    }
};

BG.event.showSongsOnBadge = function (data) {
    if (data == true) {
        chrome.browserAction.setBadgeText({text: SongsCount});
        ShowSongsOnBadge = 'true';
        ShowSongDurationOnBadge = 'false';
    } else {
        chrome.browserAction.setBadgeText({text: ''});
        ShowSongsOnBadge = 'false';
    }
};

BG.event.showSongDuration = function (data) {
    if (data == true) {
        chrome.browserAction.setBadgeText({text: SongCurrentDuration});
        ShowSongDurationOnBadge = 'true';
        ShowSongsOnBadge = 'false';
    } else {
        chrome.browserAction.setBadgeText({text: ''});
        ShowSongDurationOnBadge = 'false';
    }
};

BG.event.setPageReloadInfo = function (data) {
    CONST.PAGE_RELOADED = data;
};

BG.event.changeAudioSearchType = function (data) {
    var mainEl = document.getElementById(data.searchTypeID),
        el = mainEl.querySelector('.search-select-type div[data-index="' + data.index + '"]'),
        searchDefValue = mainEl.querySelector('.select-default-value'),
        typesList = mainEl.querySelector('.types-list');

    searchDefValue.textContent = data.text;
    mainEl.setAttribute('data-value', data.dataValue);

    typesList.querySelector('.active').classList.remove('active');
    el.classList.add('active');
    typesList.insertAdjacentElement('afterBegin', el);

    BG.event.send({
        event: 'setAudioSearchType',
        data: data
    });
};

BG.event.setAudioSearchLyricsCheckbox = function (data) {
    CACHE.LYRICS_CHECKBOX.checked = data;

    BG.event.send({
        event: 'setAudioSearchLyricsCheckbox',
        data: data
    });
};

BG.event.hideRecOverlay = function () {
    CACHE.REC_OVERLAY.classList.remove('show');
};

BG.event.showRecSongs = function (data) {
    CACHE.REC_OVERLAY.classList.add('show');

    BG.browserAction.disable();
    BG.browserAction.setIcon.update();

    BG.getData(6, {target_audio: data}, function (response) {
        var jsonData = JSON.parse(response).response;

        BG.renderAudioList(jsonData, false, false, {searchRender: true, recState: true}, function () {
            BG.browserAction.enable();
            BG.browserAction.setIcon.autoIcon();

            BG.event.send({
                event: 'reloadContent',
                data: {
                    removeSearchAjax: true
                }
            });
        });
    });
};

BG.event.searchAudio = function (data) {
    if (data.q.length > 0) {
        var lyrics = CACHE.LYRICS_CHECKBOX.checked ? 1 : 0,
            performer_only = CACHE.SONG_SEARCH_TYPE.getAttribute('data-value'),
            sort = CACHE.AUDIO_SEARCH_TYPE.getAttribute('data-value');

        CACHE.SEARCH.value = data.q;
        CACHE.EMPTY_SEARCH.classList.add('show');

        BG.browserAction.disable();
        BG.browserAction.setIcon.update();

        BG.getData(3, {q: data.q, lyrics: lyrics, performer_only: performer_only, sort: sort}, function (response) {
            var jsonData = JSON.parse(response).response;

            BG.renderAudioList(jsonData, false, false, {searchRender: true}, function () {
                BG.browserAction.enable();
                BG.browserAction.setIcon.autoIcon();

                BG.event.send({
                    event: 'reloadContent',
                    data: {
                        removeSearchAjax: true
                    }
                });
            });
        });
    } else {
        BG.event.clearSearchInput();
        BG.clearElement(document.getElementById('search-list'));

        BG.event.send({
            event: 'hideOverlay',
            data: ''
        });
    }
};

BG.event.clearSearchInput = function (data) {
    CACHE.SEARCH.value = '';
    CACHE.EMPTY_SEARCH.classList.remove('show');

    if (data && data.hideRec) {
        CACHE.REC_OVERLAY.classList.remove('show');
    }

    var searchEl = document.getElementById('search-list'),
        audioEl = document.getElementById('audio-list');

    if (searchEl) {
        searchEl.classList.add('hide');
    }

    if (audioEl) {
        audioEl.classList.remove('hide');
    }

    if (!audioEl) {
        EmptyList.classList.add('show');
    }

    BG.setStates('audio');
};

BG.event.isFirstSongPlayed = function () {
    BG.event.send({
        event: 'isFirstSongPlayed',
        data: MFCore.isFirstSongPlayed()
    });
};

/**
 * Creates new album
 *
 * @param {String} data
 */
BG.event.createNewAlbum = function (data) {
    var currUserID = JSON.parse(localStorage['authInfo']).userID;

    BG.getData(5, {title: data}, function (response) {
        console.log(resp)
        var userAlbums = JSON.parse(response).response;

        if (currUserID == VKit.getActiveAccount()) {
            BG.renderAlbums(currUserID, AlbumID, userAlbums.userAlbumsList.items, function () {
                BG.event.send({
                    event: 'reloadContent',
                    data: 'album-list'
                });

                BG.event.send({
                    event: 'closeAlbumsBox',
                    data: ''
                });
            });
        } else {
            BG.event.send({
                event: 'closeAlbumsBox',
                data: ''
            });
        }
    });
};

/**
 * Remove album by album_id
 *
 * @param {String} data
 */
BG.event.removeAlbum = function (data) {
    var id = parseInt(data),
        currUserID = JSON.parse(localStorage['authInfo']).userID;

    if (id > 0) {
        BG.getData(4, {album_id: id}, function (response) {
            console.log(response, 'albums response');
            var userAlbums = JSON.parse(response).response;

            if (id.toString() == AlbumID) {
                BG.renderAlbums(currUserID, AlbumID, userAlbums.userAlbumsList.items, function () {
                    BG.event.loadAlbum({title: chrome.i18n.getMessage('allSongs')}, function () {
                        BG.event.send({
                            event: 'reloadContent',
                            data: 'album-list'
                        });
                    });
                });
            } else {
                console.log(userAlbums, 'ooooh yeah');
                BG.renderAlbums(currUserID, AlbumID, userAlbums.userAlbumsList.items, function () {
                    BG.event.send({
                        event: 'reloadContent',
                        data: 'album-list'
                    });
                });
            }
        });
    }
};

BG.event.addSongToMyAudioList = function (data) {
    var arr = data.split(','),
        li = document.querySelector('#songs-list li[data-aid="' + arr[0] + '"] .add-to-list .add-to-my-audio-list');

    if (li && (!li.classList.contains('added') && !li.classList.contains('in-process'))) {
        li.classList.add('in-process');

        VKit.api('execute', ['code=return API.audio.add({audio_id:' + arr[0] + ',owner_id:' + arr[1] + '});'], function (response) {
            li.classList.remove('in-process');
            li.classList.add('added');

            BG.setNotification({
                type: 'basic',
                title: chrome.i18n.getMessage('songWasAdded'),
                message: '',
                iconUrl: '/images/song-added.png'
            });

            BG.event.send({
                event: 'songWasAdded',
                data: data
            });
        });
    }
};

BG.event.setNotification = function (data) {
    BG.setNotification(data);
};

BG.event.shareSong = function (data) {
    var currUserID = JSON.parse(localStorage['authInfo']).userID,
        aid = data.split('_')[1],
        li = document.querySelector('#songs-list li[data-aid="' + aid + '"] .add-to-list .post-on-wall');

    if (li && (!li.classList.contains('added') && !li.classList.contains('in-process'))) {
        li.classList.add('in-process');

        VKit.api('wall.post', ['owner_id=' + currUserID, 'attachments=audio' + data], function (response) {
            li.classList.remove('in-process');
            li.classList.add('added');

            BG.setNotification({
                type: 'basic',
                title: chrome.i18n.getMessage('songAddedToYourWall'),
                message: '',
                iconUrl: '/images/shared-item.png'
            });

            BG.event.send({
                event: 'songWasShared',
                data: data
            });
        });
    }
};

BG.event.showRemoveOverlay = function (data) {
    var el = document.querySelector('#songs-list li[data-aid="' + data + '"]');

    if (el) {
        el.getElementsByClassName('sure-overlay')[0].classList.add('show');
    }
};

BG.event.hideRemoveOverlay = function (data) {
    var el = document.querySelector('#songs-list li[data-aid="' + data + '"]');

    if (el) {
        el.getElementsByClassName('sure-overlay')[0].classList.remove('show');
    }
};

/**
 * Delete song
 *
 * @param {string} data
 */
BG.event.removeSong = function (data) {
    var currUserID = JSON.parse(localStorage['authInfo']).userID,
        code = 'return API.audio.delete({audio_id:' + data + ',owner_id:' + currUserID + '});',
        el = document.querySelector('#songs-list li[data-aid="' + data + '"]');

    if (el) {
        el.getElementsByClassName('yes-remove')[0].classList.add('active');
        el.getElementsByClassName('no-remove')[0].classList.add('hide');

        VKit.api('execute', ['code=' + code], function (response) {
            var jsonData = JSON.parse(response).response;

            if (jsonData == 1) {
                if (el) {
                    el.remove();
                }

                BG.event.send({
                    event: 'removeSongNode',
                    data: data
                });
            }
        });
    }
};

/**
 * Remove song from album
 *
 * @param {string} data
 */
BG.event.removeFromAlbum = function (data) {
    var code = 'return API.audio.moveToAlbum({album_id:"",audio_ids:[' + data + ']});';

    VKit.api('execute', ['code=' + code], function (response) {
    });
};

/**
 * Gets audio data
 *
 * @param {number} type
 * @param {object} obj
 * @param {function} callback
 */
BG.getData = function (type, obj, callback) {
    var code = '',
        currUserID = JSON.parse(localStorage['authInfo']).userID;

    if (type == 1) {
        code = 'var data = {"audioList":API.audio.get({owner_id:' + obj.userID + ',need_user:0}),"albumsList":API.audio.getAlbums({owner_id:' + obj.userID + ',count:100}),"userAlbumsList":API.audio.getAlbums({owner_id:' + currUserID + ',count:100})}; return data;';
    } else if (type == 2) {
        code = 'var data = {"audioList":API.audio.get({owner_id:' + obj.userID + ',album_id:' + obj.albumID + ',need_user:0}),"albumsList":API.audio.getAlbums({owner_id:' + obj.userID + ',count:100}),"userAlbumsList":API.audio.getAlbums({owner_id:' + currUserID + ',count:100})}; return data;';
    } else if (type == 3) {
        code = 'var data = {"audioList":API.audio.search({q:"' + obj.q + '",auto_complete:1,lyrics:' + obj.lyrics + ',perfomer_only:' + obj.performer_only + ',sort:' + obj.sort + ',search_own:1,offset:0,count:300}),"userAlbumsList":API.audio.getAlbums({owner_id:' + currUserID + ',count:100})}; return data;';
    } else if (type == 4) {
        code = 'var removeAlbum = API.audio.deleteAlbum({album_id:' + obj.id + '}); var data = {"userAlbumsList":API.audio.getAlbums({owner_id:' + currUserID + ',count:100})}; return data;';
    } else if (type == 5) {
        code = 'var addAlbum = API.audio.addAlbum({title:"' + obj.title + '"}); var data = {"userAlbumsList":API.audio.getAlbums({owner_id:' + currUserID + ',count:100})}; return data;';
    } else if (type == 6) {
        code = 'var data = {"audioList": API.audio.getRecommendations({target_audio:"' + obj.target_audio + '",count:600}),"userAlbumsList":API.audio.getAlbums({owner_id:' + currUserID + ',count:100})}; return data;';
    }

    VKit.api('execute', ['code=' + code], function (response) {
        if (callback && typeof callback == 'function') {
            callback(response);
        }
    });
};

BG.setToPlay = function () {
    if (FirstLoad) {
        BG.event.playByIndex(LastActiveIndex);
    }

    MFPlayer.play();

    if (!MFPlay.classList.contains('pause')) {
        MFPlay.className += ' pause';
    }

    if (LastActiveIndex == 1 && !CONST.PAGE_RELOADED) {
        BG.setActiveByIndex(LastActiveIndex);

        BG.event.send({
            event: 'sendSetFirstActive',
            data: ''
        });
    }

    BG.browserAction.setIcon.pause();
    BG.event.send({
        event: 'changePlayToPause',
        data: ''
    });
};

BG.setSongsStateChange = function (val) {
    CACHE.SONGS_STATE_CHANGE = val;
};

BG.getSongsStateChange = function () {
    return CACHE.SONGS_STATE_CHANGE;
};

BG.setStates = function (val) {
    CACHE.PREV_SONGS_STATE = CACHE.SONGS_STATE != undefined ? CACHE.SONGS_STATE : 'audio';
    CACHE.SONGS_STATE = val;

    BG.setSongsStateChange(true);
};

BG.setSearchType = function () {
    for (var i = 0, size = CACHE.SEARCH_SELECT_TYPES.length; i < size; i++) {
        var selectWrapper = CACHE.SEARCH_SELECT_TYPES[i];

        var option = selectWrapper.getElementsByClassName('option')[0];
        selectWrapper.querySelector('.select-default-value').textContent = option.textContent;
        selectWrapper.setAttribute('data-value', option.getAttribute('data-value'));
        option.className += ' active';
    }
};

BG.checkCurrentListState = function () {
    return CurrentSong.albumID == AlbumID && CurrentSong.owner_id == VKit.getActiveAccount();
};

/**
 * Set first song on load
 */
BG.setFirstSong = function () {
    if (LastActiveIndex)
        BG.removeActiveIndex(LastActiveIndex);

    if (LastActive)
        LastActive.className = '';

    var element = document.querySelector('#songs-list > ul > li'),
        index = element.getAttribute('data-index');

    LastActive = element;

    var song = Songs[CACHE.SONGS_STATE].items[index];

    LastActiveIndex = {
        index: index,
        id: song.id
    };

    CurrentSong = {
        aid: song.id,
        id: song.id,
        artist: song.artist,
        title: song.title,
        duration: song.duration,
        realDuration: VKit.util.secToMin(song.duration),
        index: index,
        owner_id: song.owner_id,
        albumID: AlbumID,
        url: song.url
    };

    MFDuration = CurrentSong.duration;
    BG.setSongInfo(CurrentSong.artist, CurrentSong.title, CurrentSong.realDuration);

    FirstSong = {
        url: song.url,
        duration: CurrentSong.realDuration
    };
};

/**
 * Set song info into DOM
 *
 * @param {string} artist
 * @param {string} title
 * @param {number} totalTime
 */
BG.setSongInfo = function (artist, title, totalTime) {
    MFTimeAll.textContent = totalTime;
    MFArtist.textContent = artist;
    MFTitle.textContent = title;
};

/**
 * Set desktop notification
 *
 * @param {{type: string, title: string, message: string, iconUrl: string}} options
 */
BG.setNotification = function (options) {
    chrome.notifications.create('', options, function (id) {
        setTimeout(function () {
            chrome.notifications.clear(id, function (cleared) {

            });
        }, 1500);
    });
};

/**
 * Set last active element
 *
 * @param {number} index
 */
BG.setLastActive = function (index) {
    LastActive = document.querySelector('#songs-list li[data-aid="' + index + '"]');
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
BG.setActiveByIndex = function (index) {
    var el = document.querySelector('#songs-list li[data-aid="' + index + '"]');

    if (el) {
        el.classList.add('active');
    }
};

/**
 * Remove highlight from last active element
 *
 * @param {number} index
 */
BG.removeActiveIndex = function (index) {
    var elementsArr = document.querySelectorAll('#songs-list li[data-aid="' + index + '"]');

    for (var i = 0, size = elementsArr.length; i < size; i++) {
        elementsArr[i].classList.remove('active');
    }

};

/**
 * Init function
 */
BG.init = function () {
    setTranslation();
    BG.elements();
    BG.event.listenData();
    BG.checkForAuth();
};

window.addEventListener('DOMContentLoaded', BG.init);