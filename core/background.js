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
    RepeatSongEl;

/**
 * Background main object
 *
 * @type {object}
 */
var BG = {};

BG.checkForAuth = function() {
    if(localStorage['authInfo'] != undefined) {
        AuthBlock.style.display = 'none';
        PlayerWrapperBG.style.display = 'block';
        MFCore.init();
        BG.event.listenData();
        BG.getAllAudio();
    } else {
        PlayerWrapperBG.style.display = 'none';
        BG.event.listenData();
    }
};

/**
 * Init dom elements
 */
BG.elements = function() {
    AuthBlock = document.getElementById('auth-block');
    PlayerWrapperBG = document.getElementById('player-wrapper');
    MFPlayer = document.getElementById('mf-player');
    EmptyList = document.getElementById('empty-list');
    RepeatSongEl = document.getElementById('repeat-song');
};

/**
 * Load all user audio
 *
 * @param {function} callback
 * @param {boolean} type
 */
BG.getAllAudio = function(callback, type) {
    chrome.browserAction.disable();
    BG.getUsersList();
    chrome.browserAction.setBadgeText({text: '0'});

    var userID = VKit.getActiveAccount();

    VKit.api('audio.get', ['owner_id=' + userID, 'need_user=0'], function(response) {
        Songs = JSON.parse(response).response || undefined;

        MFProgress.style.width = 0;
        var oldList = PlayerWrapperBG.getElementsByTagName('ul')[0] || undefined;

        if(oldList)
            PlayerWrapperBG.removeChild(oldList);

        var
            list = document.createElement('ul'),
            liCache = document.createElement('li'),
            spanCache = document.createElement('span');

        list.setAttribute('id', 'audio-list');

        if(Songs && !type) {
            for(var i = 1, size = Songs.length; i < size; i++) {
                var
                    li = liCache.cloneNode(false),
                    name = spanCache.cloneNode(false),
                    splitter = spanCache.cloneNode(false),
                    artist = spanCache.cloneNode(false),
                    duration = spanCache.cloneNode(false),
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

                li.appendChild(artist);
                li.appendChild(splitter);
                li.appendChild(name);
                li.appendChild(duration);
                li.setAttribute('data-index', index);

                chrome.browserAction.setBadgeText({text: index});
                list.appendChild(li);
            }

            EmptyList.style.display = 'none';
            PlayerWrapperBG.style.display = 'block';
            PlayerWrapperBG.appendChild(list);
            chrome.browserAction.enable();
            BG.setFirstSong();

            if(callback)
                callback();
        } else {
            PlayerWrapperBG.style.display= 'none';
            EmptyList.style.display = 'block';
            chrome.browserAction.enable();

            if(callback)
                callback();
        }
    });
};

BG.getUsersList = function() {
    var usersInfo = VKit.getUserInfo(),
        img = document.createElement('img'),
        div = document.createElement('div'),
        activeUser = document.getElementById('current-user'),
        allUsers = document.getElementById('all-users');

    BG.clearElement(activeUser);
    BG.clearElement(allUsers);

    for(var i in usersInfo) {
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

        if(VKit.getActiveAccount() == user.id) {
            var uw = userWrapper.cloneNode(true);
            activeUser.appendChild(userWrapper);

            uw.className += ' active';
            allUsers.appendChild(uw);
        } else {
            allUsers.appendChild(userWrapper);
        }
    }
};

BG.clearElement = function(element) {
    var i = element.childElementCount;

    while(--i >= 0)
        element.removeChild(element.firstChild);
};

BG.setActiveSong = function(index) {
    var eIndex = index - 1,
        e = document.getElementById('player-wrapper').getElementsByTagName('li')[eIndex];

    if(LastActive)
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
BG.event.connect = function() {
    Port = chrome.runtime.connect({name: 'bg'});

    Port.onDisconnect.addListener(function(e) {
        ConnectStatus = false;
    });
};

/**
 * Listen for data
 */
BG.event.listenData = function() {
    if(!DataListen) {
        chrome.runtime.onConnect.addListener(function(port) {
            DataListen = true;
            BG.event.connect();

            if(port.name == 'content' || port.name == 'settings')
                ConnectStatus = false;
            else
                ConnectStatus = true;

            console.log(port);
            port.onMessage.addListener(function(msg) {
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
BG.event.send = function(data) {
    if(ConnectStatus)
        Port.postMessage(data);
};

BG.event.checkPlayed = function(data) {
    if(MFPlayer.src == '') {
        if(LastActiveIndex)
            Core.removeActiveIndex(LastActiveIndex);

        if(LastActive)
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
BG.event.sendPlay = function(data) {
    if(data == null) {
        MFCore.set(FirstSong.url, FirstSong.duration);
        MFPlayer.src = FirstSong.url;
        MFPlayer.play();
        MFPlay.className += ' pause';
        LastActive.className = 'active';

        BG.event.send({
            event: 'changePlayToPause',
            data: ''
        });

        BG.event.send({
            event: 'sendSetFirstActive',
            data: FirstSong
        });
    }
};

BG.event.checkFirstLoad = function(data) {
    if(FirstLoad) {
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

BG.event.mute = function() {
    LastVolume = MFPlayer.volume ? MFPlayer.volume : 1;
    MFPlayer.volume = 0;
};

BG.event.unmute = function() {
    MFPlayer.volume = LastVolume;
};

BG.event.setToPause = function(data) {
    if(MFPlayer.paused) {
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

BG.event.setToPlay = function(data) {
    MFPlayer.play();
    if(!MFPlay.classList.contains('pause'))
        MFPlay.className += ' pause';

    BG.setActiveByIndex(LastActiveIndex);

    if(LastActiveIndex == 1) {
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

BG.event.playNext = function(data) {
    MFCore.playNext();
};

BG.event.playPrev = function(data) {
    MFCore.playPrev();
};

/**
 * Play song by index
 *
 * @param {number} data
 */
BG.event.playByIndex = function(data) {
    if(typeof(MFPlayer.ontimeupdate) != 'function')
        MFCore.events();

    var song = Songs[data];
    MFDuration = song.duration;

    MFPlayer.src = song.url;
    MFPlayer.play();

    if(!MFPlay.classList.contains('pause'))
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
        artist: song.artist,
        title: song.title,
        duration: minutes,
        realDuration: song.duration
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

    FirstLoad = false;
};

BG.event.getSongDuration = function() {
    BG.event.send({
        event: 'setSongDuration',
        data: CurrentSong.realDuration
    })
};

BG.event.setRepeatSong = function(data) {
    console.log(RepeatSong);
    if(RepeatSong) {
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
BG.event.changeCurrentTime = function(data) {
    if(MFPlayer.src != '') {
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
BG.event.changeVolume = function(data) {
    MFVolume.value = data.volumeValue;
    MFPlayer.volume = data.volume;
    MFVolumeLine.style.width = data.volumeWidth;
};

/**
 * First app load
 */
BG.event.firstLoad = function() {
    if(FirstLoad == false) {
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


BG.event.sendFirstLoad = function(data) {
    BG.event.firstLoad();
};

/**
 * Update audio list
 * @param data
 */
BG.event.updateList = function(data) {
    BG.getAllAudio(function() {
        MFCore.set(FirstSong.url, FirstSong.duration);
        MFPlayer.src = FirstSong.url;
        MFPlay.classList.remove('pause');

        BG.event.send({
            event: 'setSongDuration',
            date: CurrentSong.realDuration
        });

        BG.event.send({
            event: 'reloadContent',
            data: ''
        });
    }, false);
};

BG.event.openAuth = function(data) {
    VKit.openAuthWindow(function() {

    });
};

BG.event.setActiveUser = function(data) {
    VKit.setActiveAccount(data);
    BG.event.updateList();
    BG.event.send({
        event: 'updateSettingsView',
        data: ''
    });
};

BG.event.updateUsersList = function(data) {
    BG.getUsersList();
};

/**
 * Set first song on load
 */
BG.setFirstSong = function() {
    if(LastActiveIndex)
        BG.removeActiveIndex(LastActiveIndex);

    if(LastActive)
        LastActive.className = '';

    var element = document.getElementById('player-wrapper').getElementsByTagName('li')[0],
        index = element.getAttribute('data-index');

    LastActive = element;
    LastActiveIndex = 1;

    var song = Songs[index];

    CurrentSong = {
        artist: song.artist,
        title: song.title,
        duration: VKit.util.secToMin(MFDuration),
        realDuration: song.duration
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
BG.setSongInfo = function(artist, title, totalTime) {
    MFTimeAll.textContent = totalTime;
    MFArtist.textContent = artist;
    MFTitle.textContent = title;
};


/**
 * Set desktop notification
 *
 * @param {{type: string, title: string, message: string, iconUrl: string}} options
 */
BG.setNotification = function(options) {
    chrome.notifications.create('', options, function(id) {
        setTimeout(function() {
            chrome.notifications.clear(id, function(cleared) {

            });
        }, 2500);
    });
};

/**
 * Set last active element
 *
 * @param {number} index
 */
BG.setLastActive = function(index) {
    var i = index - 1;
    LastActive = document.getElementById('player-wrapper').getElementsByTagName('li')[i];
};

/**
 * Highlight current song
 *
 * @param {number} index
 */
BG.setActiveByIndex = function(index) {
    var i = index - 1;
    document.getElementById('player-wrapper').getElementsByTagName('li')[i].className = 'active';
};

/**
 * Remove highlight from last element
 *
 * @param {number} index
 */
BG.removeActiveIndex = function(index) {
    var i = index - 1,
        element = document.getElementById('player-wrapper').getElementsByTagName('li')[i] || undefined;

    if(element)
        element.className = '';
};

/**
 * Init function
 */
BG.init = function() {
    setTranslation();
    BG.elements();
    BG.checkForAuth();
};

window.addEventListener('DOMContentLoaded', BG.init);