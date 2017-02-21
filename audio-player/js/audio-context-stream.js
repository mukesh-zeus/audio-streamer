(function () {
    'use strict';


    var fileInput, getStreamButton, playButton, stopButton, Audio, audioObj, startTime;

    window.onload = function () {
        document.getElementById('play').disabled = true;
        document.getElementById('stop').disabled = true;
    }

    fileInput = document.getElementById('music-file');
    getStreamButton = document.getElementById('get-stream');
    playButton = document.getElementById('play');
    stopButton = document.getElementById('stop');

    //var jsonARR = { 'audio': [] };
    //window.jsonARR = jsonARR;

    Audio = function (fileInput, getStreamButton, playButton, stopButton) {

        var musicURL = [], createBlobURL, getStream, files, suspended, streamStarted, addFiles,
            audioCtx, /*bufferSource,*/ audioProcessorNode,
            processAudio, streamEnds;
        // window.musicURL = musicURL;//DEBUGGING

        suspended = false;
        streamStarted = false;

        //Create AudioContext
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        // buffer:
        var audioBuffer = audioCtx.createBuffer(2, 4096, 44100);

        // Buffer source for audio context
        var bufferSource = audioCtx.createBufferSource();
        // window.bufferSource = bufferSource;//DEBUGGING


        // Create a ScriptProcessorNode with a bufferSize of 4096 and 2 input and 2 output channel
        var bufferSize = 4096;
        var outputChannels = 2;
        var inputChannels = 2;
        audioProcessorNode = audioCtx.createScriptProcessor(bufferSize, inputChannels, outputChannels);
        // window.audioProcessorNode = audioProcessorNode;//DEBUGGING


        addFiles = function () {
            files = fileInput.files;
        }
        fileInput.addEventListener('change', addFiles)

        // creates blobURLs from files in file object
        createBlobURL = function () {
            for (var i = 0; i < files.length; i++) {
                musicURL[i] = URL.createObjectURL(files[i]);
            }
            console.log('music URL created');
        }

        var audioDataJSON;
        var channel = [];
        // retrieving data from the blob URL is only through XMLHttpRequest
        this.getStream = function (event) {

            //createBlobURL();

            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'resources/raw-data/voice-sample.json', true);
            xhr.responseType = 'json';
            xhr.send();

            xhr.onload = function () {
                audioDataJSON = xhr.response;
                playButton.disabled = false;

                console.log('got-stream');
                //window.audioDataJSON = audioDataJSON;
                setTimeout(playButton.click(), 1000)
                //setInterval(play(), 1000);
            }
        }

        // things to be done when audio is being processed
        var count = 0;
        // var bufferIndex
        processAudio = function (audioProcessingEvent) {

            if (audioDataJSON.length > 0) {
                //console.log('audio processing');
                var outputBuffer = audioProcessingEvent.outputBuffer;// same as buffer in decodeAudioData

                var diff = Date.now() - playingBaseNTP;
                var jsonDataLength = audioDataJSON.length;
                var curPKT = [];
                for (var i = 0; i < jsonDataLength; ++i) {
                    if (audioDataJSON[i].timeStamp > firstPacketNTP + diff) {
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
                        for (var bufferIndex = 0; bufferIndex < bufferSize; ++bufferIndex) {
                            outputData[0][bufferIndex] = curPKT[curPKTIndex].data[0][bufferIndex];
                            if (curPKT[curPKTIndex].data[1])
                                outputData[1][bufferIndex] = curPKT[curPKTIndex].data[1][bufferIndex];
                        }
                    }

                    // for (var curPKTIndex = 0; curPKTIndex < curPKT.length; ++curPKTIndex) {
                    //     for (var bufferIndex = 0; bufferIndex < bufferLength; ++bufferIndex) {
                    //         for (var channelIndex = 0; channelIndex < noOfChannels; ++noOfChannels) {
                    //             outputData[channelIndex][bufferIndex] = curPKT[curPKTIndex].data[channelIndex][bufferIndex];
                    //         }
                    //     }
                    // }

                    // audioDataJSON.splice(0, curPKT.length);
                }
                if (audioDataJSON.length === 0) {
                    // console.log(diff);
                    audioCtx.suspend();
                    stopButton.disabled = true;
                }
            }

        }

        var playingBaseNTP, firstPacketNTP;


        function play(event) {
            stopButton.disabled = false;
            playingBaseNTP = Date.now();
            firstPacketNTP = audioDataJSON[0].timeStamp;
            // this.disabled = true;
            playButton.disabled = true;
            if (suspended) {
                audioCtx.resume();
                suspended = false;
                return true;
            }
            bufferSource.connect(audioProcessorNode);
            // audioCtx.destination is the rendering device
            audioProcessorNode.connect(audioCtx.destination);
            if (!streamStarted)
                bufferSource.start();

            streamStarted = true;
            console.log('Sample Rate ' + audioCtx.sampleRate);
        }
        playButton.addEventListener('click', play);
        // wire up play button
        this.play = play;

        this.stop = function (event) {
            audioCtx.suspend();
            playButton.disabled = false;
            suspended = true;
        }

        // When the buffer bufferSource stops playing, disconnect everything
        streamEnds = function () {
            console.log('stream ended');
            stopButton.disabled = true;
            bufferSource.disconnect(audioProcessorNode); // disconnect script processor from 
            audioProcessorNode.disconnect(audioCtx.destination);
        }

        audioProcessorNode.addEventListener('audioprocess', processAudio);
        bufferSource.addEventListener('ended', streamEnds);

    }// end Audio

    audioObj = new Audio(fileInput, getStreamButton, playButton, stopButton);

    stopButton.addEventListener('click', audioObj.stop);
    playButton.addEventListener('click', audioObj.play);
    getStreamButton.addEventListener('click', audioObj.getStream);

})();
