(function () {
    'use strict';

    var AudioPlayer = function () {

        var audioDataJSON;

        this.streamStarted = false;
        this.suspended = false;
        this.playingBaseNTP;
        this.firstPacketNTP;
        this.clientBufferSize;

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
            setTimeout(_this.playButton.click(), 100);
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

        // var time = (new Date()).getTime();

        if (audioDataJSON.length > 0) {

            var outputBuffer, diff, jsonDataLength, curPKT = [], outputData = [];

            outputBuffer = audioProcessingEvent.outputBuffer;// same as buffer in decodeAudioData
            diff = Date.now() - this.playingBaseNTP;
            jsonDataLength = audioDataJSON.length;
            curPKT = [];
            // window.curPKT = curPKT;
            for (var i = 0; i < jsonDataLength; ++i) {
                if (audioDataJSON[i].timeStamp > this.firstPacketNTP + diff) {
                    break;
                }
                curPKT.push(audioDataJSON[i]);
            }

            outputData[0] = outputBuffer.getChannelData(0);
            outputData[1] = outputBuffer.getChannelData(1);

            if (curPKT.length > 0) {

                var lengthOfPKT, sourceBufferLength, clientBuffer = [];
                // window.clientBuffer = clientBuffer;

                lengthOfPKT = curPKT.length
                sourceBufferLength = Object.keys(curPKT[0].data[0]).length;

                var clientBufferIndex = 0, curPKTIndex = 0, sourceBufferIndex = 0;
                while (clientBufferIndex != this.clientBufferSize && curPKTIndex < lengthOfPKT) {

                    clientBuffer[clientBufferIndex] = curPKT[curPKTIndex].data[0][sourceBufferIndex];
                    sourceBufferIndex++;

                    if (sourceBufferIndex === sourceBufferLength) {
                        curPKTIndex++;
                        sourceBufferIndex = 0;
                    }
                    clientBufferIndex++;

                }

                for (var clientBufferIndex = 0; clientBufferIndex < this.clientBufferSize; ++clientBufferIndex) {
                    outputData[0][clientBufferIndex] = clientBuffer[clientBufferIndex];
                    outputData[1][clientBufferIndex] = clientBuffer[clientBufferIndex];
                }

                audioDataJSON.splice(0, curPKT.length);

            }

            if (audioDataJSON.length === 0) {
                this.stop();
                this.playButton.disabled = true;
            }
            // console.log(this.audioCtx.currentTime + " time:" + ((new Date()).getTime() - time));
        }
    };

    AudioPlayer.prototype.stop = function (event) {
        this.audioCtx.suspend();
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.suspended = true;
    };

    var bufferSize = 4096 * 2;
    var outputChannels = 2;
    var inputChannels = 1;

    var audioPlayer = new AudioPlayer();

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audioPlayer.audioCtx = new AudioContext();
    audioPlayer.bufferSource = audioPlayer.audioCtx.createBufferSource();
    audioPlayer.audioProcessorNode = audioPlayer.audioCtx.createScriptProcessor(bufferSize, inputChannels, outputChannels);
    audioPlayer.clientBufferSize = bufferSize;
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
