var APP_VERSION = localStorage['statusAc'];

chrome.browserAction.setBadgeBackgroundColor({color: '#4E729A'});

var
    AuthBlock,
    PlayerWrapperBG,
    MFPlayer,
    Songs,
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
    Broadcast;

/**
 * Background main object
 *
 * @type {object}
 */
var BG = {};

BG.checkForAuth = function () {
    if (localStorage['authInfo'] != undefined && (localStorage['statusAc'] != undefined && localStorage['statusAc'] != '' && localStorage['statusAc'] != 'false')) {
        AuthBlock.style.display = 'none';
        PlayerWrapperBG.style.display = 'block';
        MFCore.init();
        BG.event.listenData();
        BG.getAllAudio(false, false, false, false, true);
    } else {
        PlayerWrapperBG.style.display = 'none';
        BG.event.listenData();
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
};

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
 */
BG.getAllAudio = function (callback, type, api, albumID, noFirst) {
    chrome.browserAction.disable();
    BG.getUsersList();

    if (!BG.isPlay()) {
        if (ShowSongsOnBadge == 'true' || ShowSongsOnBadge == undefined) {
            chrome.browserAction.setBadgeText({text: '0'});
        }
    }

    var userID = VKit.getActiveAccount();

    if (!api) {
        VKit.api('audio.get', ['owner_id=' + userID, 'need_user=0'], function (response) {
            renderAudioList(response);
        });
    } else if (api == 'albums') {
        VKit.api('audio.get', ['owner_id=' + userID, 'album_id=' + albumID, 'need_user=0'], function (response) {
            renderAudioList(response);
        });
    }

    VKit.api('audio.getAlbums', ['owner_id=' + userID, 'count=100'], function (response) {
        var AlbumList = document.getElementById('album-list'),
            Albums = JSON.parse(response).response,
            allSongs = document.createElement('div');

        BG.clearElement(AlbumList);
        if (Albums != undefined) {
            if (!albumID)
                allSongs.className = 'active';

            allSongs.textContent = chrome.i18n.getMessage('allSongs');
            allSongs.setAttribute('data-id', 'null');
            AlbumList.appendChild(allSongs);


            for (var i = 1, size = Albums.length; i < size; i++) {
                var data = Albums[i],
                    album = document.createElement('div');

                if (albumID && data.album_id == albumID)
                    album.className = 'active';

                album.textContent = data.title;
                album.setAttribute('data-id', data.album_id);

                AlbumList.appendChild(album);

            }
        }
    });

    function renderAudioList(response) {
        Songs = JSON.parse(response).response || undefined;

        MFProgress.style.width = 0;
        var oldList = PlayerWrapperBG.getElementsByTagName('ul')[0] || undefined;

        if (oldList)
            PlayerWrapperBG.removeChild(oldList);

        var list = document.createElement('ul'),
            liCache = document.createElement('li'),
            spanCache = document.createElement('span');

        list.setAttribute('id', 'audio-list');

        if (Songs && !type) {
            for (var i = 1, size = Songs.length; i < size; i++) {
                var li = liCache.cloneNode(false),
                    name = spanCache.cloneNode(false),
                    splitter = spanCache.cloneNode(false),
                    artist = spanCache.cloneNode(false),
                    duration = spanCache.cloneNode(false),
                    addToAlbum = spanCache.cloneNode(false),
                    saveSong = document.createElement('a'),
                    index = i.toString();

                /**
                 * Audio object
                 *
                 * @type {{aid: number, artist: string, duration: number, genre: number, lyrics_id: number, owner_id: number, title: string, url: string}}
                 */
                var audio = Songs[i];

                //set content
                name.textContent = audio.title;
                artist.textContent = audio.artist;
                duration.textContent = VKit.util.secToMin(audio.duration);

                //set class
                name.className = 'title';
                splitter.className = 'splitter';
                artist.className = 'artist';
                duration.className = 'duration';
                addToAlbum.className = 'add-song';
                saveSong.className = 'save-song';

                saveSong.href = audio.url;
                saveSong.setAttribute('download', audio.artist + ' - ' + audio.title);

                li.appendChild(artist);
                li.appendChild(splitter);
                li.appendChild(name);
                li.appendChild(duration);
                li.appendChild(saveSong);
                li.appendChild(addToAlbum);
                li.setAttribute('data-index', index);

                SongsCount = index;

                if (ShowSongsOnBadge == 'true' && ShowSongDurationOnBadge == 'false') {
                    chrome.browserAction.setBadgeText({text: index});
                }

                list.appendChild(li);
            }

            if (ShowSongsOnBadge == 'false' && ShowSongDurationOnBadge == 'true') {
                chrome.browserAction.setBadgeText({text: SongCurrentDuration});
            }

            EmptyList.style.display = 'none';
            PlayerWrapperBG.style.display = 'block';
            PlayerWrapperBG.appendChild(list);
            chrome.browserAction.enable();

            if (noFirst)
                BG.setFirstSong();

            if (callback)
                callback();
        } else {
            PlayerWrapperBG.style.display = 'none';
            EmptyList.style.display = 'block';
            chrome.browserAction.enable();

            if (callback)
                callback();
        }
    }
};

BG.getUsersList = function () {
    var usersInfo = VKit.getUserInfo(),
        img = document.createElement('img'),
        div = document.createElement('div'),
        activeUser = document.getElementById('current-user'),
        allUsers = document.getElementById('all-users');

    BG.clearElement(activeUser);
    BG.clearElement(allUsers);

    for (var i in usersInfo) {
        var user = usersInfo[i],
            name = div.cloneNode(false),
            userWrapper = div.cloneNode(false),
            photo = img.cloneNode(false);

        photo.src = user.photo;
        name.textContent = user.firstName + ' ' + user.lastName;

        photo.className = 'user-photo';
        name.className = 'user-name';

        userWrapper.className = 'user';
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
    var i = element.childElementCount;

    while (--i >= 0)
        element.removeChild(element.firstChild);
};

BG.setActiveSong = function (index) {
    var eIndex = index - 1,
        e = document.getElementById('player-wrapper').getElementsByTagName('li')[eIndex];

    if (LastActive)
        LastActive.className = '';

    e.className = 'active';
    LastActive = e;
    LastActiveIndex = eIndex;
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

            console.log(port);
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

        MFCore.set(Songs[index].url, Songs[index].duration);
    }
};

/**
 * Play song
 *
 * @param {object} data
 */
BG.event.sendPlay = function (data) {
    if (data == null)
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

        BG.event.send({
            event: 'changePauseToPlay',
            data: ''
        });
    }
};

BG.event.setToPlay = function (data) {
    if (FirstLoad)
        BG.event.playByIndex(LastActiveIndex);

    MFPlayer.play();
    if (!MFPlay.classList.contains('pause'))
        MFPlay.className += ' pause';

    BG.setActiveByIndex(LastActiveIndex);

    if (LastActiveIndex == 1) {
        BG.event.send({
            event: 'sendSetFirstActive',
            data: ''
        });
    }

    BG.event.send({
        event: 'changePlayToPause',
        data: ''
    });
};

BG.event.playNext = function (data) {
    console.log(data);
    if (data)
        MFCore.playNext(data);
    else
        MFCore.playNext();
};

BG.event.playPrev = function (data) {
    MFCore.playPrev();
};

/**
 * Play song by index
 *
 * @param {number} data
 */
BG.event.playByIndex = function (data) {
    if (typeof(MFPlayer.ontimeupdate) != 'function')
        MFCore.events();

    var song = Songs[data];
    MFDuration = song.duration;

    MFPlayer.src = song.url;
    MFPlayer.play();

    if (!MFPlay.classList.contains('pause'))
        MFPlay.className += ' pause';

    BG.removeActiveIndex(LastActiveIndex);
    BG.setActiveByIndex(data);
    BG.setLastActive(data);

    BG.event.send({
        event: 'setNewHighLightElement',
        data: {
            oldIndex: LastActiveIndex,
            newIndex: data
        }
    });

    LastActiveIndex = data;

    var minutes = VKit.util.secToMin(MFDuration);

    CurrentSong = {
        id: song.aid,
        artist: song.artist,
        title: song.title,
        duration: minutes,
        realDuration: song.duration,
        index: data,
        owner: song.owner_id
    };

    BG.setSongInfo(CurrentSong.artist, CurrentSong.title, CurrentSong.duration);

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
        VKit.api('audio.setBroadcast', ['audio=' + CurrentSong.owner + '_' + CurrentSong.id], function (response) {
        });
    }

    FirstLoad = false;
};

BG.event.getSongDuration = function () {
    BG.event.send({
        event: 'setSongDuration',
        data: {
            dur: CurrentSong.realDuration,
            index: CurrentSong.index
        }
    });
};

BG.event.setRepeatSong = function (data) {
    if (RepeatSong) {
        RepeatSong = false;
        RepeatSongEl.className = '';

        BG.event.send({
            event: 'setNonActiveRepeat',
            data: ''
        });
    } else {
        RepeatSong = true;
        RepeatSongEl.className = 'active';

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
        BG.event.setToPlay('true');
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


BG.event.sendFirstLoad = function (data) {
    BG.event.firstLoad();
};

/**
 * Update audio list
 * @param {object} data
 * @param {Function} callback
 */
BG.event.updateList = function (data, callback, userUpdate) {
    if (AlbumID) {
        BG.getAllAudio(function () {
            if (!BG.isPlay()) {
                chrome.browserAction.setBadgeText({text: '0:00'});
            }

            BG.event.send({
                event: 'setSongDuration',
                date: CurrentSong.realDuration
            });

            BG.event.send({
                event: 'reloadContent',
                data: ''
            });

            if(callback)
                callback();
        }, false, 'albums', AlbumID, false);
    } else {
        BG.getAllAudio(function () {
            if (!BG.isPlay()) {
                chrome.browserAction.setBadgeText({text: '0:00'});
            }

            BG.event.send({
                event: 'setSongDuration',
                date: CurrentSong.realDuration
            });

            var sendMsg = userUpdate || '';

            BG.event.send({
                event: 'reloadContent',
                data: sendMsg
            });

            if(callback)
                callback();
        }, false, false, false, false);
    }
};

BG.event.openAuth = function (data) {
    VKit.openAuthWindow(function () {
    });
};

BG.event.setActiveUser = function (data) {
    VKit.setActiveAccount(data);
    AlbumID = '';
    BG.event.updateList(false, function() {
        BG.event.send({
            event: 'setActiveCoreUser',
            data: {
                id: data
            }
        })
    }, 'album-list');
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

BG.event.loadAlbum = function (data) {
    var sendMsg = '';

    if (data.id == undefined) {
        AlbumID = data.id;
        sendMsg = 'first';
    } else {
        AlbumID = data.id;
        sendMsg = data.id;
    }

    document.getElementById('album-title').textContent = data.title == chrome.i18n.getMessage('allSongs') ? chrome.i18n.getMessage('albums') : data.title;
    BG.event.updateList(null, function() {
        BG.event.send({
            event:'setActiveAlbum',
            data: {
                id: sendMsg
            }
        });
    });
};

BG.event.downloadSong = function (data) {
    var index = data.index - 1,
        link = document.getElementById('audio-list').getElementsByTagName('li')[index].getElementsByTagName('a')[0],
        me = document.createEvent('MouseEvents');

    me.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    link.dispatchEvent(me);
};

BG.event.setShuffleSongs = function (data) {
    if (ShuffleSongs) {
        ShuffleSongs = false;
        ShuffleSongsEl.className = '';

        BG.event.send({
            event: 'setShuffleToDisable',
            data: ''
        });
    } else {
        ShuffleSongs = true;
        ShuffleSongsEl.className = 'active';

        BG.event.send({
            event: 'setShuffleToActive',
            data: ''
        });
    }
};

BG.event.setBroadcastSong = function (data) {
    if (BroadcastStatus) {
        BroadcastStatus = false;
        Broadcast.className = '';
        VKit.api('audio.setBroadcast', [''], function (response) {
            console.log(response);
            BG.event.send({
                event: 'setBroadcastToDisable',
                data: ''
            });
        });
    } else {
        BroadcastStatus = true;
        Broadcast.className = 'active';

        VKit.api('audio.setBroadcast', ['audio=' + CurrentSong.owner + '_' + CurrentSong.id], function (response) {
            console.log(response);
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

/**
 * Set first song on load
 */
BG.setFirstSong = function () {
    if (LastActiveIndex)
        BG.removeActiveIndex(LastActiveIndex);

    if (LastActive)
        LastActive.className = '';

    var element = document.getElementById('player-wrapper').getElementsByTagName('li')[0],
        index = element.getAttribute('data-index');

    LastActive = element;
    LastActiveIndex = 1;

    var song = Songs[index];

    CurrentSong = {
        id: song.aid,
        artist: song.artist,
        title: song.title,
        duration: VKit.util.secToMin(MFDuration),
        realDuration: song.duration,
        owner: song.owner_id
    };

    MFDuration = CurrentSong.realDuration;
    BG.setSongInfo(CurrentSong.artist, CurrentSong.title, CurrentSong.duration);

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
        }, 2500);
    });
};

/**
 * Set last active element
 *
 * @param {number} index
 */
BG.setLastActive = function (index) {
    var i = index - 1;
    LastActive = document.getElementById('player-wrapper').getElementsByTagName('li')[i];
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
BG.setActiveByIndex = function (index) {
    var i = index - 1;
    document.getElementById('player-wrapper').getElementsByTagName('li')[i].className = 'active';
};

/**
 * Remove highlight from last element
 *
 * @param {number} index
 */
BG.removeActiveIndex = function (index) {
    var i = index - 1,
        element = document.getElementById('player-wrapper').getElementsByTagName('li')[i] || undefined;

    if (element)
        element.className = '';
};

/**
 * Init function
 */
BG.init = function () {
    setTranslation();
    BG.elements();
    BG.checkForAuth();
};

window.addEventListener('DOMContentLoaded', BG.init);