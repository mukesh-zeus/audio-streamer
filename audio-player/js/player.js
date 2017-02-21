(function () {
    'use strict';

    var AudioPlayer = function () {

        var audioDataJSON;

        this.streamStarted = false;
        this.suspended = false;
        this.playingBaseNTP;
        this.firstPacketNTP;

        this.audioCtx;
        // Buffer source for audio context
        this.bufferSource;
        // A ScriptProcessor node which processes audio data
        this.audioProcessorNode;
        this.count = 0;
        this.startStreamButton;
        this.playButton;
        this.stopButton;
        this.setAudioData = function (jsonObj) {
            audioDataJSON = jsonObj;
        };
        this.getAudioData = function () {
            return audioDataJSON;
        };

    };

    AudioPlayer.prototype.start = function (event) {
        var _this = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'resources/raw-data/voice-sample.json', true);
        xhr.responseType = 'json';
        xhr.send();

        xhr.onload = function () {
            _this.setAudioData(xhr.response)
            _this.playButton.disabled = false;

            console.log('got-stream');
            window.audioDataJSON = xhr.response;
            setTimeout(_this.playButton.click(), 100)
            //setInterval(play(), 1000);
        }

    };

    AudioPlayer.prototype.play = function (event) {
        var audioDataJSON = this.getAudioData();
        this.playingBaseNTP = Date.now();
        this.firstPacketNTP = audioDataJSON[0].timeStamp;

        // audioCtx.destination is the rendering device
        this.bufferSource.connect(this.audioProcessorNode);
        this.audioProcessorNode.connect(this.audioCtx.destination);

        this.stopButton.disabled = false;
        this.playButton.disabled = true;

        if (this.suspended) {
            this.audioCtx.resume();
            this.suspended = false;
            return true;
        }

        if (!this.streamStarted) {
            this.bufferSource.start();
            this.streamStarted = true;
        }

        console.log('Sample Rate ' + this.audioCtx.sampleRate);

    };

    AudioPlayer.prototype.processAudio = function (audioProcessingEvent) {

        var audioDataJSON = this.getAudioData();
        var time = (new Date()).getTime();
        if (audioDataJSON.length > 0) {
            //console.log('audio processing');
            var outputBuffer = audioProcessingEvent.outputBuffer;// same as buffer in decodeAudioData
            var diff = Date.now() - this.playingBaseNTP;
            var jsonDataLength = audioDataJSON.length;
            var curPKT = [];
            window.curPKT = curPKT;
            for (var i = 0; i < jsonDataLength; ++i) {
                if (audioDataJSON[i].timeStamp > this.firstPacketNTP + diff) {
                    break;
                }
                curPKT.push(audioDataJSON[i]);
            }

            var outputData = [];
            outputData[0] = outputBuffer.getChannelData(0);
            outputData[1] = outputBuffer.getChannelData(1);

            if (curPKT.length > 0) {

                var bufferLength = Object.keys(curPKT[0].data[0]).length;
                // var noOfChannels = Object.keys(curPKT[0].data).length;

                for (var curPKTIndex = 0; curPKTIndex < curPKT.length; ++curPKTIndex) {
                    var inputData = curPKT[curPKTIndex].data[0];
                    for (var bufferIndex = 0; bufferIndex < bufferLength; ++bufferIndex) {
                        outputData[0][bufferIndex] = inputData[bufferIndex];
                        outputData[1][bufferIndex] = inputData[bufferIndex];
                    }
                }

                
                audioDataJSON.splice(0, curPKT.length);
            }



            if (audioDataJSON.length === 0) {
                this.stop();
                this.playButton.disabled = true;

            }

            console.log(this.audioCtx.currentTime + " time:" + ((new Date()).getTime() - time));
        }
    };

    AudioPlayer.prototype.stop = function (event) {
        this.audioCtx.suspend();
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.suspended = true;
    };

    var bufferSize = 4096;
    var outputChannels = 2;
    var inputChannels = 1;

    var audioPlayer = new AudioPlayer();

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audioPlayer.audioCtx = new AudioContext();
    audioPlayer.bufferSource = audioPlayer.audioCtx.createBufferSource();
    audioPlayer.audioProcessorNode = audioPlayer.audioCtx.createScriptProcessor(bufferSize, inputChannels, outputChannels);
    audioPlayer.audioProcessorNode.addEventListener('audioprocess', function (audioEvent) { audioPlayer.processAudio(audioEvent) });

    audioPlayer.playButton = document.getElementById('play');
    audioPlayer.playButton.disabled = true;
    audioPlayer.playButton.addEventListener('click', function (event) { audioPlayer.play(event) });

    audioPlayer.stopButton = document.getElementById('stop');
    audioPlayer.stopButton.disabled = true;
    audioPlayer.stopButton.addEventListener('click', function (event) { audioPlayer.stop(event) });

    audioPlayer.startStreamButton = document.getElementById('start-stream');
    audioPlayer.startStreamButton.addEventListener('click', function (event) { audioPlayer.start(event) });


})();
