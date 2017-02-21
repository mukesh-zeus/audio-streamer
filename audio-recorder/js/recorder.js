(function () {
    var AudioRecorder = function () {

        //variable initialization
        this.recordAudioButton = document.getElementById('record'), this.stopAudioButton = document.getElementById('stop');
        this.AudioContext = null, this.context = null, this.input = null, this.processor = null, this.source = null;
        this.outputData = new Array(), this.timeDifference = new Array(), this.lastOutputDataIndex = 0;

        //channel configuration
        this.buffer = 4096, this.inputChannels = 1, this.outputChannels = 1;
    };

    //audio recorder
    AudioRecorder.prototype.record = function (stream) {

        this.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();

        this.input = this.context.createMediaStreamSource(stream);
        this.processor = this.context.createScriptProcessor(this.buffer, this.inputChannels, this.outputChannels);

        this.input.connect(this.processor);
        this.processor.connect(this.context.destination);

        var oldThis = this;

        this.processor.onaudioprocess = function (e) {

            var chunkBuffer = new Array(oldThis.inputChannels);
            for (var channelIndex = 0; channelIndex < oldThis.inputChannels; ++channelIndex) {

                var inputBuffer = e.inputBuffer.getChannelData(channelIndex);
                var outputBuffer = e.outputBuffer.getChannelData(channelIndex);

                for (var i = 0; i < inputBuffer.length; i++) {
                    outputBuffer[i] = inputBuffer[i];
                }

                chunkBuffer[channelIndex] = JSON.parse(JSON.stringify(outputBuffer));
            }

            oldThis.createJson(chunkBuffer, Date.now());
        }

    }

    //error log
    AudioRecorder.prototype.error = function (e) {
        console.log('Failed to capture data.' + e)
    }

    //start recording
    AudioRecorder.prototype.startRecording = function () {
        this.recordAudioButton.disabled = true;
        this.stopAudioButton.disabled = false;
        //get stream from microphone
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(recorder.record.bind(this)).catch(recorder.error);
    }

    //stop recording
    AudioRecorder.prototype.stopRecording = function () {
        this.stopAudioButton.disabled = true;
        this.recordAudioButton.disabled = false;
        this.input.disconnect(this.processor);
        this.processor.disconnect(this.context.destination);
        this.printFinalOutput();
        this.downloadJson();

    }

    //=====================object of recorder=========================================
    var recorder = new AudioRecorder();

    //event registration
    recorder.recordAudioButton.addEventListener('click', function () {
        recorder.startRecording();
    });

    recorder.stopAudioButton.addEventListener('click', function () {
        recorder.stopRecording();
    });


    //========================================utility functions========================================

    AudioRecorder.prototype.createJson = function (chunkBuffer, timeStamp) {
        item = {};
        item['timeStamp'] = timeStamp;
        item['data'] = {};
        for (var i = 0; i < this.inputChannels; ++i)
            item['data'][i] = chunkBuffer[i];

        this.outputData[this.lastOutputDataIndex++] = item;
    }

    AudioRecorder.prototype.printFinalOutput = function () {
        console.log(this.outputData);
    }

    AudioRecorder.prototype.downloadJson = function () {
        var jsonObject = JSON.stringify(this.outputData);
        var a = document.createElement("a");
        var file = new Blob([jsonObject], { type: 'text/json' });
        a.href = URL.createObjectURL(file);
        a.download = 'onechannel.json';
        a.click();
    }

})();