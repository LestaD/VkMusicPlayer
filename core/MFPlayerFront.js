var
    progressLine = 0,
    progressTime = 0,
    songProgressWidth = 0,
    y = 0,
    vtime = 0,
    volume = 0,
    progressBarWidth = 0,
    progressBarClickState = false,
    volumeClickState = false,
    volumeHoverState = false,
    playState = false,
    lastVolume,
    PlayerWrapper,
    MFPlayer,
    MFBuffer,
    MFProgress,
    MFSongProgress,
    MFPlay,
    MFDuration,
    MFTimeCurrent,
    MFTimeAll,
    MFArtist,
    MFTitle;


/**
 * MF Player Core
 *
 * @type {object} object
 */
var MFCore = {};

/**
 * Show audio loading progress
 */
MFCore.loadProcess = function() {

    var
        bufferedData = MFPlayer.buffered,
        bufferedSize = bufferedData.length,
        end,
        start,
        width;

    if(bufferedSize > 0) {
        while(bufferedSize--) {
            start = bufferedData.end(bufferedSize);
            end = bufferedData.start(bufferedSize);
            width = (((start - end) / MFDuration) * 100).toString();
            MFBuffer.style.width = width + '%';
        }
    }
};

/**
 * Init DOM elements
 */
MFCore.setElements = function() {
    PlayerWrapper = document.getElementById('player-bound');
    MFPlayer = document.getElementById('mf-player');
    MFBuffer = document.getElementById('mf-buffer');
    MFProgress = document.getElementById('mf-progress');
    MFSongProgress = document.getElementById('mf-song-progress');
    MFTimeAll = document.getElementById('mf-duration');
    MFTimeCurrent = document.getElementById('mf-current-time');
    MFPlay = document.getElementById('mf-play');
    MFArtist = document.getElementById('mf-artist');
    MFTitle = document.getElementById('mf-title');

    songProgressWidth = MFSongProgress.clientWidth;
};

/**
 * Update track timeline
 */
MFCore.updateState = function() {
    var
        songTime = Math.round((parseFloat(MFProgress.style.width) / songProgressWidth) * MFDuration),
        seconds = 0,
        minutes = 0;

    if(songTime) {
        minutes = Math.floor(songTime / 60);
        seconds = Math.round(songTime) - (60 * minutes);

        if(seconds > 59) {
            seconds = Math.round(songTime) - (60 * minutes);

            if(seconds == 60) {
                minutes = Math.round(songTime / 60);
                seconds = 0;
            }
        }
    }

    progressBarWidth = ((MFPlayer.currentTime / MFDuration) * songProgressWidth);

    if(minutes < 10)
        minutes = '0' + minutes;

    if(seconds < 10)
        seconds = '0' + seconds;

    MFProgress.style.width = progressBarWidth + 'px';
    MFTimeCurrent.textContent = minutes + ':' + seconds;
};

/**
 * Change current time by mouse clicking
 * @param {event} e
 */
MFCore.changeCurrentTime = function(e) {
    progressLine = e.pageX - MFSongProgress.getBoundingClientRect().left;
    progressTime = (progressLine / songProgressWidth) * MFDuration;
};

/**
 * Start play
 */
MFCore.startPlay = function() {
    MFPlayer.play();
    MFPlay.className += ' pause';
};


/**
 * Set player src
 *
 * @param {string} url
 * @param {number} duration
 */
MFCore.set = function(url, duration) {
    MFDuration = duration;
    MFTimeAll.textContent = VKit.util.secToMin(duration);

    MFSongProgress.addEventListener('mousedown', function(e) {
        progressBarClickState = true;
        MFCore.changeCurrentTime(e);

    });
    MFSongProgress.addEventListener('mousemove', function(e) {
        if(progressBarClickState)
            MFCore.changeCurrentTime(e);
    });
    MFSongProgress.addEventListener('mouseup',function() {
        progressBarClickState = false;
        Core.send({event:'changeCurrentTime', data: progressTime});
    });
};

/**
 * Init Player
 */
MFCore.init = function() {
    MFCore.setElements();
};