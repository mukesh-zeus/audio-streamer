(function () {
    'use strict';

    var AudioPlayer = function () {

        var audioDataJSON;
        this.streamStarted = false;
        this.suspended = false;
        this.playingBaseNTP;
        this.firstPacketNTP;
        this.clientSampleFrames;

        this.audioCtx;
        // A ScriptProcessor node which processes audio data
        this.audioProcessorNode;
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
        decoderWorker.postMessage('Hello World');
        var _this = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '../../../../raw-data/voice-sample1.json', true);
        xhr.responseType = 'json';
        xhr.send();

        xhr.onload = function () {
            _this.setAudioData(xhr.response)
            _this.playButton.disabled = false;

            console.log('got-stream');
            // window.audioDataJSON = xhr.response;
            setTimeout(_this.playButton.click(), 500);
            // _this.play();
        }

    };

    AudioPlayer.prototype.play = function (event) {

        this.playingBaseNTP = Date.now();


        // audioCtx.destination is the rendering device
        // this.bufferSource.connect(this.audioProcessorNode);
        this.audioProcessorNode.connect(this.audioCtx.destination);

        this.stopButton.disabled = false;
        this.playButton.disabled = true;

        console.log('Sample Rate ' + this.audioCtx.sampleRate);

    };

    AudioPlayer.prototype.processAudio = function (audioProcessingEvent) {

        var audioDataJSON = this.getAudioData();

        // var time = (new Date()).getTime();

        var outputBuffer, jsonDataLength;


        outputBuffer = audioProcessingEvent.outputBuffer; // same as buffer in decodeAudioData
        jsonDataLength = audioDataJSON.length;

        var sourceBufferLength;
        sourceBufferLength = audioDataJSON[0].data[0].length;

        var outputData = [];
        outputData[0] = outputBuffer.getChannelData(0);
        outputData[1] = outputBuffer.getChannelData(1);
        for (var clientBufferIndex = 0; clientBufferIndex < this.clientSampleFrames; ++clientBufferIndex) {
            outputData[0][clientBufferIndex] = 0;
            outputData[1][clientBufferIndex] = 0;
        }

        if (currentPktPos === jsonDataLength) {
            this.stop();
            this.playButton.disabled = true;
            console.log((Date.now() - this.playingBaseNTP) / 1000);
        }

        var clientBufferIndex = 0, sourceBufferIndex = 0;
        while (clientBufferIndex != this.clientSampleFrames && currentPktPos < jsonDataLength) {

            var frame = audioDataJSON[currentPktPos].data[0][sourceBufferIndex];
            outputData[0][clientBufferIndex] = frame;
            outputData[1][clientBufferIndex] = frame;
            sourceBufferIndex++;

            if (sourceBufferIndex === sourceBufferLength) {
                currentPktPos++;
                // console.log('currPKTPOS ' + currentPktPos + ' jsonDataLength ' + jsonDataLength);
                sourceBufferIndex = 0;
            }
            clientBufferIndex++;
        }

        // console.log(this.audioCtx.currentTime + " time:" + ((new Date()).getTime() - time));
    };

    AudioPlayer.prototype.stop = function (event) {

        this.audioProcessorNode.disconnect(this.audioCtx.destination);
        this.playButton.disabled = false;
        this.stopButton.disabled = true;
        this.suspended = true;
    };


    // worker:
    var decoderWorker = new Worker('js/worker/decoder.js');
    decoderWorker.addEventListener('message', function (e) {
        console.log('Worker said: ', e.data);
    });

    

    var currentPktPos = 0;
    var sampleFrames = 16384;
    var outputChannels = 2;
    var inputChannels = 1;

    var audioPlayer = new AudioPlayer();

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audioPlayer.audioCtx = new AudioContext();
    // audioPlayer.bufferSource = audioPlayer.audioCtx.createBufferSource();
    audioPlayer.audioProcessorNode = audioPlayer.audioCtx.createScriptProcessor(sampleFrames, inputChannels, outputChannels);
    audioPlayer.clientSampleFrames = sampleFrames;
    audioPlayer.audioProcessorNode.addEventListener('audioprocess', function (audioEvent) { audioPlayer.processAudio(audioEvent) });

    audioPlayer.playButton = document.getElementById('play');
    audioPlayer.playButton.disabled = false;
    audioPlayer.playButton.addEventListener('click', function (event) { audioPlayer.play(event) });

    audioPlayer.stopButton = document.getElementById('stop');
    audioPlayer.stopButton.disabled = true;
    audioPlayer.stopButton.addEventListener('click', function (event) { audioPlayer.stop(event) });

    audioPlayer.startStreamButton = document.getElementById('start-stream');
    audioPlayer.startStreamButton.addEventListener('click', function (event) { audioPlayer.start(event) });


})();