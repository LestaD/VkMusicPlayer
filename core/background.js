chrome.browserAction.disable();
chrome.browserAction.setBadgeBackgroundColor({color: '#4E729A'});


var
    AuthBlock,
    PlayerWrapper,
    MFPlayer,
    Songs,
    LastActive,
    LastActiveIndex,
    Port,
    FirstSong = {},
    FirstLoad = true,
    ConnectStatus = false,
    CurrentSong = {},
    LastVolume = 0;

/**
 * Background main object
 *
 * @type {object}
 */
var BG = {};

BG.checkForAuth = function() {
    if(VKit.authInfo('token') != undefined) {
        AuthBlock.style.display = 'none';
        PlayerWrapper.style.display = 'block';
        BG.getAllAudio();
    }
};

/**
 * Init dom elements
 */
BG.elements = function() {
    AuthBlock = document.getElementById('auth-block');
    PlayerWrapper = document.getElementById('player-wrapper');
    MFPlayer = document.getElementById('mf-player');
};

/**
 * Load all user audio
 */
BG.getAllAudio = function(callback) {
    var userID = VKit.authInfo('userID');

    VKit.api('audio.get', ['owner_id=' + userID, 'need_user=0'], function(response) {
        Songs = JSON.parse(response).response;

        MFProgress.style.width = 0;
        var oldList = PlayerWrapper.getElementsByTagName('ul')[0] || undefined;

        if(oldList)
            PlayerWrapper.removeChild(oldList);

        var
            list = document.createElement('ul'),
            liCache = document.createElement('li'),
            spanCache = document.createElement('span');

        list.setAttribute('id','audio-list');

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

        PlayerWrapper.appendChild(list);
        chrome.browserAction.enable();
        BG.setFirstSong();

        if(callback)
            callback();
    });
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
    Port = chrome.runtime.connect();

    Port.onDisconnect.addListener(function(e) {
        ConnectStatus = false;
    });
};

/**
 * Listen for data
 */
BG.event.listenData = function() {
    chrome.runtime.onConnect.addListener(function(popup) {
        BG.event.connect();
        ConnectStatus = true;

        popup.onMessage.addListener(function(msg) {
            console.log(msg);
            BG.event[msg.event](msg.data);
        });
    });
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
    MFPlayer.pause();
    MFPlay.classList.remove('pause');

    BG.event.send({
        event: 'changePauseToPlay',
        data: ''
    });
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
    });
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

    console.log(CurrentSong.realDuration);

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
    chrome.notifications.create('',options, function(id) {

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
    var i = index - 1;
    document.getElementById('player-wrapper').getElementsByTagName('li')[i].className = '';
};

/**
 * Init function
 */
BG.init = function() {
    setTranslation();
    MFCore.init();
    BG.event.listenData();
    BG.elements();
    BG.checkForAuth();


};

window.addEventListener('DOMContentLoaded', BG.init);