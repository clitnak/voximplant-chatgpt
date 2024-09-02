require(Modules.Avatar);

let call;

//const callingFrom = '13852733009';


const avatarIDForChatGPT = "05883004-42eb-4d72-a792-5dec2b41e461"; //Rebecca
const avatarID = avatarIDForChatGPT;

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  call = e.call;
  call.answer();
  
  call.addEventListener(CallEvents.Connected, () => {
    processVoiceAvatar(call);
  });
});

const processVoiceAvatar = (call, callData) => {
  // configure the avatar
  const avatarConfig = {
    avatarId: avatarID, 
    extended: false,
    customData: callData
    };

  // configure the VoiceAvatar asr parameters
  const asrParameters = {
    //model: ASRProfileList.Microsoft
    profile: ASRProfileList.Deepgram.en_US,
    phraseHints: [],
    singleUtterance: true,
    interimResults: false,
  };

  // configure the VoiceAvatar tts parameters
  const ttsPlayerOptions = {
    //language: VoiceList.Microsoft.Neural.en_US_DavisNeural,
    language: VoiceList.Microsoft.Neural.en_US_AvaNeural,
    progressivePlayback: true
  };

  // define onError callback function
  const onError = (errorEvent) => {
    CallList.reportError({ result: errorEvent });
    Logger.write('ERROR!');
    Logger.write(JSON.stringify(errorEvent));
    call.hangup();
    //VoxEngine.terminate();
  }

  // define onFinish callback function
  const onFinish = (finishEvent) => {
    //CallList.reportResult({ result: finishEvent });
    Logger.write(JSON.stringify(finishEvent));
    call.hangup()
    //VoxEngine.terminate();
  }

  // create the VoiceAvatar instance
  const voiceAvatar = VoximplantAvatar.createVoiceAvatar({
    call: call,
    asrEndOfPhraseDetectorTimeout: 1000,
    onErrorCallback: onError,
    onFinishCallback: onFinish,
    avatarConfig: avatarConfig,
    asrParameters: asrParameters,
    ttsPlayerParameters: ttsPlayerOptions
  });

}

