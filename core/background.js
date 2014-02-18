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
    ConnectStatus = false;

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
BG.getAllAudio = function() {
    var userID = VKit.authInfo('userID');

    VKit.api('audio.get', ['owner_id=' + userID, 'need_user=0'], function(response) {
        Songs = JSON.parse(response).response;

        var list = document.createElement('ul'),
            liCache = document.createElement('li'),
            spanCache = document.createElement('span');

        for(var i = 1, size = Songs.length; i < size; i++) {
            var li = liCache.cloneNode(false),
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
    });


};

BG.play = function(index) {
//    BG.setActiveSong(index);
//    MFPlayer.src = Songs[index].url;
//    MFPlayer.play();
};

BG.setActiveSong = function(index) {
    var eIndex = index - 1;
    var e = document.getElementById('player-wrapper').getElementsByTagName('li')[eIndex];

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

    Port.onDisconnect.addListener(function(e){
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
        MFCore.set(FirstSong.url,FirstSong.duration);
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
    MFPlay.className += ' pause';

    BG.event.send({
        event: 'changePlayToPause',
        data: ''
    });
};

/**
 * Play song by index
 *
 * @param {object} data
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

    BG.setSongInfo(song.artist, song.title, minutes);

    BG.event.send({
        event: 'changeSongInfo',
        data: {
            artist: song.artist,
            title: song.title,
            duration: minutes,
            realDuration: song.duration
        }
    });

    BG.event.send({
        event: 'changePlayToPause',
        data: ''
    });
};

BG.event.changeCurrentTime = function(data) {
    MFPlayer.currentTime = data;
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

    MFDuration = song.duration;
    BG.setSongInfo(song.artist, song.title, VKit.util.secToMin(MFDuration));

    FirstSong = {
        url: song.url,
        duration: song.duration
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
    MFCore.init();
    BG.event.listenData();
    BG.elements();
    BG.checkForAuth();
};

window.addEventListener('DOMContentLoaded', BG.init);