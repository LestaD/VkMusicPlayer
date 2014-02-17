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
    FirstLoad = false;

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
};

/**
 * Listen for data
 */
BG.event.listenData = function() {
    chrome.runtime.onConnect.addListener(function(popup) {
        BG.event.connect();
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
    console.log(data);
    if(data == null) {
        MFCore.set(FirstSong.url,FirstSong.duration);
        LastActive.className = 'active';
        BG.event.send({
            event: 'sendSetFirstActive',
            data: ''
        });
    }
};

/**
 * First app load
 */
BG.event.firstLoad = function() {
    if(FirstLoad == false) {
        BG.event.send({
            event: 'firstLoad',
            data: {
                firstLoad: 'true'
            }
        });

        FirstLoad = true;
    }
};


BG.event.sendFirstLoad = function(data) {
    BG.event.firstLoad();
};

/**
 * Set first song on load
 *
 * @returns {{url: (*|url|string|string|undefined), duration: (*|Number|number)}}
 */
BG.setFirstSong = function() {
    if(LastActiveIndex)
        BG.removeActiveIndex(LastActiveIndex);

    if(LastActive)
        LastActive.className = '';

    var element = document.getElementById('player-wrapper').getElementsByTagName('li')[0],
        index = element.getAttribute('data-index');

    LastActive = element;

    var song = Songs[index];

    MFPlayer.src = song.url;
    MFDuration = song.duration;
    MFTimeAll.textContent = VKit.util.secToMin(MFDuration);
    MFArtist.textContent = song.artist;
    MFTitle.textContent = song.title;

    FirstSong = {
        url: song.url,
        duration: song.duration
    };
};

BG.removeActiveIndex = function(index) {
    document.getElementById('player-wrapper').getElementsByTagName('li')[index].className = '';
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