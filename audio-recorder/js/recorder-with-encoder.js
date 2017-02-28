(function() {
    'use strict';
    var AudioRecorder = function() {
        //configuration
        this.config = {};
        this.config.command = 'init';
        this.config.numberOfChannels = 1;
        this.config.originalSampleRate = 44100;
        this.config.encoderSampleRate = 44100;
        this.config.maxBufferPerPage = 40;
        this.config.encoderApplication = 2049;
        this.config.encoderFrameSize = 20;
        this.config.bufferLength = 4096;
        this.config.resampleQuality = 3;
        this.config.encoderPath = 'js/encoderWorker.min.js';
        this.state = 'inactive';

        //variable initialization
        this.recordAudioButton = document.getElementById('record'), this.stopAudioButton = document.getElementById('stop');

        this.AudioContext = null, this.context = null, this.microphoneInput = null, this.audioProcessorNode = null, this.source = null;
        this.outputData = new Array(), this.timeDifference = new Array(), this.lastOutputDataIndex = 0;
        this.encoderWorker = null;
    };


    //audio recorder
    AudioRecorder.prototype.record = function(stream) {

        this.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();


        this.microphoneInput = this.context.createMediaStreamSource(stream);
        this.audioProcessorNode = this.context.createScriptProcessor(this.config.bufferLength, this.config.numberOfChannels, this.config.numberOfChannels);

        this.microphoneInput.connect(this.audioProcessorNode); //microphone -> audioprocessing
        this.audioProcessorNode.connect(this.context.destination); //audioprocessing -> destination 

        var oldThis = this;

        //process audio data while recording 
        this.audioProcessorNode.onaudioprocess = function(e) {

            var chunkBuffer = new Array(oldThis.config.numberOfChannels);

            for (var channelIndex = 0; channelIndex < oldThis.config.numberOfChannels; ++channelIndex) {

                chunkBuffer[channelIndex] = [];
                var inputBuffer = e.inputBuffer.getChannelData(channelIndex);
                var outputBuffer = e.outputBuffer.getChannelData(channelIndex);

                for (var i = 0; i < inputBuffer.length; i++) {
                    outputBuffer[i] = inputBuffer[i];
                    chunkBuffer[channelIndex][i] = inputBuffer[i];
                }
            }

            //encode current packet
            oldThis.encoderWorker.postMessage({
                command: 'encode',
                buffers: chunkBuffer
            });

            //oldThis.addChunk(chunkBuffer, Date.now());
        }

    };

    //send or save data


    AudioRecorder.prototype.startRecording = function() {
        //set encoder worker
        this.encoderWorker = new Worker(this.config.encoderPath);

        //set buttons
        this.recordAudioButton.disabled = true;
        this.stopAudioButton.disabled = false;

        //get stream from microphone
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(recorder.record.bind(this)).catch(recorder.error);


        //initialize encoder
        this.state = 'recording';
        this.encoderWorker.postMessage(this.config);

        //send data on onmessage event of worker
        this.encoderWorker.addEventListener('message', function(e) {
            //send encoded data of current packet
            console.log('encoded : ' + e.data);
        });
    };


    AudioRecorder.prototype.stopRecording = function() {

        this.state = 'inactive';

        //close encoding Worker
        this.encoderWorker.postMessage({
            command: 'done'
        });

        //reset buttons
        this.stopAudioButton.disabled = true;
        this.recordAudioButton.disabled = false;

        //disconnect media stream
        this.microphoneInput.disconnect(this.audioProcessorNode);
        this.audioProcessorNode.disconnect(this.context.destination);


        //this.printFinalOutput();
        //this.downloadJson();
    };


    //=====================object of recorder=========================================
    var recorder = new AudioRecorder();

    //event registration
    recorder.recordAudioButton.addEventListener('click', function() {
        recorder.startRecording();
    });

    recorder.stopAudioButton.addEventListener('click', function() {
        recorder.stopRecording();
    });

})();