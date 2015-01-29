if((localStorage['showSongsOnBadge'] == '' || localStorage['showSongsOnBadge'] == undefined) && (localStorage['showSongDuration'] == '' || localStorage['showSongDuration'] == undefined)) {
    localStorage['showSongDuration'] = 'true';
    localStorage['showSongsOnBadge'] = 'false';
}

var
    progressLine = 0,
    progressTime = 0,
    songProgressWidth = 0,
    progressBarWidth = 0,
    progressBarClickState = false,
    PlayerWrapper,
    MFPlayer,
    MFBuffer,
    MFProgress,
    MFSongProgress,
    MFPlay,
    MFDuration = 0,
    MFTimeCurrent,
    MFTimeAll,
    MFArtist,
    MFTitle,
    MFVolumeWrapper,
    MFVolumeLine,
    MFVolume,
    SongCurrentDuration = '0:00',
    ShowSongsOnBadge = localStorage['showSongsOnBadge'],
    ShowSongDurationOnBadge = localStorage['showSongDuration'];

/**
 * MF Player Core
 *
 * @type {object} object
 */
var MFCore = {};

/**
 * Show audio loading progress
 */
MFCore.loadProcess = function () {

    var
        bufferedData = MFPlayer.buffered,
        bufferedSize = bufferedData.length,
        end,
        start,
        width;

    if (bufferedSize > 0) {
        while (bufferedSize--) {
            start = bufferedData.end(bufferedSize);
            end = bufferedData.start(bufferedSize);
            width = (((start - end) / MFDuration) * 100).toString();

            var lp = width + '%';
            MFBuffer.style.width = lp;

            BG.event.send({
                event: 'setLoadProgress',
                data: lp
            });
        }
    }
};

/**
 * Init DOM elements
 */
MFCore.setElements = function () {
    PlayerWrapper = document.getElementById('player-bound');
    MFPlayer = new Audio();
    MFBuffer = document.getElementById('mf-buffer');
    MFProgress = document.getElementById('mf-progress');
    MFSongProgress = document.getElementById('mf-song-progress');
    MFTimeAll = document.getElementById('mf-duration');
    MFTimeCurrent = document.getElementById('mf-current-time');
    MFPlay = document.getElementById('mf-play');
    MFArtist = document.getElementById('mf-artist');
    MFTitle = document.getElementById('mf-title');
    MFVolumeWrapper = document.getElementById('mf-volume-wrapper');
    MFVolumeLine = document.getElementById('mf-volume-line');
    MFVolume = document.getElementById('mf-volume');

    songProgressWidth = MFSongProgress.clientWidth;
};

/**
 * Update track timeline
 */
MFCore.updateState = function () {
    var songTime = Math.round((parseFloat(MFProgress.style.width) / songProgressWidth) * MFDuration),
        seconds = 0,
        minutes = 0;

    if (songTime) {
        minutes = Math.floor(songTime / 60);
        seconds = Math.round(songTime) - (60 * minutes);

        if (seconds > 59) {
            seconds = Math.round(songTime) - (60 * minutes);

            if (seconds == 60) {
                minutes = Math.round(songTime / 60);
                seconds = 0;
            }
        }
    }

    progressBarWidth = ((MFPlayer.currentTime / MFDuration) * songProgressWidth);

    if (seconds < 10) {
        seconds = '0' + seconds;
    }

    var ct = minutes + ':' + seconds,
        pbWidth = progressBarWidth + 'px';

    MFProgress.style.width = pbWidth;
    MFTimeCurrent.textContent = ct;
    SongCurrentDuration = ct;

    if (ShowSongDurationOnBadge == 'true') {
        if (BG.isPlay()) {
            chrome.browserAction.setBadgeText({text: SongCurrentDuration});
        }
    }

    BG.event.send({
        event: 'timeUpdate',
        data: ct
    });

    BG.event.send({
        event: 'setProgressBarWidth',
        data: pbWidth
    });
};

/**
 * Change current time by mouse clicking
 * @param {event} e
 */
MFCore.changeCurrentTime = function (e) {
    progressLine = e.pageX - MFSongProgress.getBoundingClientRect().left;
    progressTime = (progressLine / songProgressWidth) * MFDuration;
};


/**
 * Set player src
 *
 * @param {string} url
 * @param {number} duration
 */
MFCore.set = function (url, duration) {
    MFPlayer.src = url;
    MFDuration = duration;
    MFTimeAll.textContent = VKit.util.secToMin(duration);
    MFCore.events();
};

/**
 * Init player events
 */
MFCore.events = function () {
    MFPlayer.ontimeupdate = MFCore.updateState;
    MFPlayer.addEventListener('progress', MFCore.loadProcess);
    MFSongProgress.addEventListener('mousedown', function (e) {
        progressBarClickState = true;
        MFCore.changeCurrentTime(e);

    });
    MFSongProgress.addEventListener('mousemove', function (e) {
        if (progressBarClickState)
            MFCore.changeCurrentTime(e);
    });
    MFSongProgress.addEventListener('mouseup', function () {
        progressBarClickState = false;
        MFPlayer.currentTime = progressTime;
    });
    MFPlayer.addEventListener('ended', MFCore.playNext);
};


/**
 * Play next song in list
 */
MFCore.playNext = function (force) {
    var fp = false;

    if (typeof force == 'boolean')
        fp = true;

    if (ShuffleSongs) {
        var random = Math.floor((Math.random() * Songs[CACHE.SONGS_STATE].length));

        BG.event.playByIndex({index: random});
    } else {
        if (RepeatSong && !fp) {
            BG.event.playByIndex(LastActiveIndex.index);
        } else {
            if (MFCore.isFirstSongPlayed() || CACHE.PREV_SONGS_STATE != CACHE.SONGS_STATE) {
                var next = 1;
            } else {
                var next = parseInt(LastActiveIndex.index) + 1;
            }

            if ((next + 1) > Songs[CACHE.SONGS_STATE].length)
                next = 1;

            BG.event.playByIndex({index: next});
        }
    }

    if (!ConnectStatus) {
        BG.setNotification({
            type: 'basic',
            title: CurrentSong.title,
            message: CurrentSong.artist + ' - ' + CurrentSong.title + ' ' + CurrentSong.duration,
            iconUrl: '/app-icon.png'
        });
    }
};

/**
 * Play prev song in list
 */
MFCore.playPrev = function () {
    var prev = parseInt(LastActiveIndex.index) - 1;

    if (ShuffleSongs) {
        var random = Math.floor((Math.random() * Songs[CACHE.SONGS_STATE].length));

        BG.event.playByIndex({index: random});
    } else {
        if (!BG.checkCurrentListState() || CACHE.PREV_SONGS_STATE != CACHE.SONGS_STATE) {
            prev = -1;
        }

        if (prev <= 0) {
            prev = Songs[CACHE.SONGS_STATE].length - 1;
        }

        BG.event.playByIndex({index: prev});
    }

    if (!ConnectStatus) {
        BG.setNotification({
            type: 'basic',
            title: CurrentSong.title,
            message: CurrentSong.artist + ' - ' + CurrentSong.title + ' ' + CurrentSong.duration,
            iconUrl: '/app-icon.png'
        });
    }
};

MFCore.nullSongCurrentDuration = function () {
    SongCurrentDuration = '0:00';
};

MFCore.getSongCurrentDuration = function () {
    return SongCurrentDuration;
};

MFCore.isFirstSongPlayed = function() {
    return !BG.checkCurrentListState() || (LastActiveIndex.index == 1 && MFPlayer.paused && MFPlayer.currentTime == 0);
};

/**
 * Init Player
 */
MFCore.init = function () {
    MFCore.setElements();
};