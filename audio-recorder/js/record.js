(function () {
    //gloabal declarations
    var recordAudioButton = document.getElementById('record'), stopAudioButton = document.getElementById('stop');
    var AudioContext, context, input, processor, source;
    var outputData = new Array(), timeDifference = new Array(), lastOutputDataIndex = 0;

    //event registration
    recordAudioButton.addEventListener('click', startRecording);
    stopAudioButton.addEventListener('click', stopRecording);
   

    //channel configuration
    var buffer = 4096, inputChannels = 1, outputChannels = 1;
    
    

    var handleSuccess = function (stream) {
     
        AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();

        input = context.createMediaStreamSource(stream);
        processor = context.createScriptProcessor(buffer, inputChannels, outputChannels);

        input.connect(processor);
        processor.connect(context.destination);
     
        
        processor.onaudioprocess = function (e) {

            var chunkBuffer = new Array(inputChannels);
            for (var channelIndex = 0; channelIndex < inputChannels; ++channelIndex) {
                
                var inputBuffer = e.inputBuffer.getChannelData(channelIndex);
                var outputBuffer = e.outputBuffer.getChannelData(channelIndex);

                for (var i = 0; i < inputBuffer.length; i++) {
                    outputBuffer[i] = inputBuffer[i];
                }

                chunkBuffer[channelIndex] = JSON.parse(JSON.stringify(outputBuffer));
            }

            createJson(chunkBuffer, Date.now());
        }
     
    }

    var handleFail = function (e) {
        console.log('Failed to capture data.'+e);
    }

    function startRecording() {
        this.disabled = true;
        stopAudioButton.disabled = false;
        //get stream from microphone
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(handleSuccess).catch(handleFail);
    }

    function stopRecording() {
        this.disabled = true;
        recordAudioButton.disabled = false;
        printFinalOutput();
        downloadJson();
        input.disconnect(processor);
        processor.disconnect(context.destination);
    }


    //========================================utility functions========================================

    function createJson(chunkBuffer, timeStamp) {
        item = {};
        item['timeStamp'] = timeStamp;
        item['data'] = {};
        for (var i = 0; i < inputChannels; ++i)
            item['data'][i] = chunkBuffer[i];

        outputData[lastOutputDataIndex++] = item;
    }

    function printFinalOutput() {
            console.log(outputData);
    }

    function downloadJson() {
        var jsonObject = JSON.stringify(outputData);
        var a = document.createElement("a");
        var file = new Blob([jsonObject], { type: 'text/json' });
        a.href = URL.createObjectURL(file);
        a.download = 'onechannel.json';
        a.click();
    }
    
    

})();