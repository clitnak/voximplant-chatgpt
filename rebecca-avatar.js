/*
 * This avatar is a chatgpt assistant wrapper
 */

const OPEN_AI_KEY = "monkeypants";
//const OPEN_AI_ASSISTANT_ID = "asst_rS6evAoYMSqdDSWm5M3UqvyU"; //Ray from orriant
const OPEN_AI_ASSISTANT_ID = "asst_rS6evAoYMSqdDSWm5M3UqvyU"; //Rebecca from Joe's Plumbing
const ROOT_URL = "https://api.openai.com/v1/";
const THREADS_ENDPOINT = ROOT_URL + "threads";
const THREADS_RUNS_ENDPOINT = ROOT_URL + "threads/runs";

var currentThread;
var visitedMessages = {};

function getThreadEndpoint(threadId) {
  return THREADS_ENDPOINT + "/" + threadId;
}

function getThreadRunEndpoint(threadId) {
  return getThreadEndpoint(threadId) + "/runs";
}

function getThreadMessagesEndpoint(threadId) {
  return getThreadEndpoint(threadId) + "/messages";
}

setStartState('start');
addState({
  name: 'start',
  onEnter: async (event) => {
    var startTime = new Date().getTime();
    let chatGPTResponse = await chatGPTstartChatThread();
    var elapsed = new Date().getTime() - startTime;
    Logger.write(`chatGPT waiting for response in ms: ${elapsed}`);
    currentThread = chatGPTResponse.threadId;
    visit(chatGPTResponse.lastMessageId);
    //Logger.write(`chatGPT response(${lastMessageId()}): ${chatGPTResponse.message}`);
    return Response({ utterance: chatGPTResponse.message, listen: true });
  },
  onUtterance: async (event) => {
    //Logger.write(`user response: ${event.text}`);
    var startTime = new Date().getTime();
    await chatGPTRespond(currentThread, event.text);
    let chatGPTResponse = await chatGPTwaitForResponse(currentThread);
    var elapsed = new Date().getTime() - startTime;
    Logger.write(`chatGPT waiting for response in ms: ${elapsed}`);
    currentThread = chatGPTResponse.threadId;
    visit(chatGPTResponse.lastMessageId);
    //Logger.write(`chatGPT response(${lastMessageId()}): ${chatGPTResponse.message}`);
    return Response({ utterance: chatGPTResponse.message, listen: true });
  },
});

addState({
  name: 'final',
  onEnter: (event) => {
    return Response({ isFinal: true });
  },
});

async function chatGPTRespond(threadId, response) {
  let url = getThreadMessagesEndpoint(threadId);
  return await Net.httpRequestAsync(url, {
        headers: [
            "Content-Type: application/json",
            "Authorization: Bearer " + OPEN_AI_KEY,
            "OpenAI-Beta: assistants=v2"
        ],
        method: 'POST',
        postData: JSON.stringify({
           role: "user", 
           content: response
        })
    }).then((rawResponse) => {
      //Logger.write("raw respond-to thread: " + JSON.stringify(rawResponse));
      //Logger.write(`Added Message. old lastMessageId... ${lastMessageId()}`);
      visit(JSON.parse(rawResponse.text).id);
      //Logger.write(`...new lastMessageId ${lastMessageId()}`);
      return chatGPTRunThreadToGetResponse(threadId);
    })
}

async function chatGPTRunThreadToGetResponse(threadId) {
  let url = getThreadRunEndpoint(threadId);
  return await Net.httpRequestAsync(url, {
        headers: [
            "Content-Type: application/json",
            "Authorization: Bearer " + OPEN_AI_KEY,
            "OpenAI-Beta: assistants=v2"
        ],
        method: 'POST',
        postData: JSON.stringify({
          "assistant_id": OPEN_AI_ASSISTANT_ID
        })
    })
}


async function chatGPTstartChatThread() {
    return await Net.httpRequestAsync(THREADS_RUNS_ENDPOINT, {
        headers: [
            "Content-Type: application/json",
            "Authorization: Bearer " + OPEN_AI_KEY,
            "OpenAI-Beta: assistants=v2"
        ],
        method: 'POST',
        postData: JSON.stringify({
           "assistant_id": OPEN_AI_ASSISTANT_ID,
           "thread" : { "messages": [
              { role: "user", content: `Start the conversation now with: Joe's plumbing, this is Rebecca!` }
            ] }
        })
    })
    .then((rawResponse) => {
      Logger.write("raw create-and-run thread: " + JSON.stringify(rawResponse));
      return JSON.parse(rawResponse.text).thread_id;
    })
    .then((threadId) => {
      
      return chatGPTwaitForResponse(threadId);
    });
}

async function chatGPTwaitForResponse(threadId) {
  var latest = null;
  var count = 1;
  do {
    const start = Date.now();
    await sleep(50);
    //Logger.write(`elapsed: ${Date.now() - start}, latest: ${JSON.stringify(latest)}`);
    latest = await chatGPTgetLatestResponse(threadId);
    //Logger.write(`elapsed: ${Date.now() - start}, latest2: ${JSON.stringify(latest)}, length of content: ${latest.content.length}`);
    count++;
  } while ((latest.role == "user" || latest.content.length == 0 || hasBeenVisited(latest.id)) && count <= 50)
  var messageText = latest.content[0].text.value
  //Logger.write('old MessageID' + lastMessageId());
  visit(latest.id);
  //Logger.write('new MessageID' + lastMessageId());
  
  return {threadId, lastMessageId: lastMessageId(), message: messageText };
}

async function chatGPTgetLatestResponse(threadId) {
    let url = getThreadMessagesEndpoint(threadId);
    var params = {
        headers: [
            "Content-Type: application/json",
            "Authorization: Bearer " + OPEN_AI_KEY,
            "OpenAI-Beta: assistants=v2"
        ],
        method: 'GET',
        params: {limit: 1}
    }
    let rawResponse = await Net.httpRequestAsync(url, params);
    let response = JSON.parse(rawResponse.text);
    Logger.write("raw message response: " + rawResponse.text);
    return response.data[0];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


lastRecordedMessageId = null;
function hasBeenVisited(messageId) {
  return messageId in visitedMessages;
}

function visit(messageId) {
  if(messageId != lastRecordedMessageId && hasBeenVisited(messageId)) {
    var err = `ERROR: going backwards in conversation. ${messageId} was visitied more than one message in the past on the thread`;
    Logger.write(err);
    throw err;
  }
  visitedMessages[messageId] = true;
  lastRecordedMessageId=messageId;
}

function lastMessageId() {
  return lastRecordedMessageId;
}