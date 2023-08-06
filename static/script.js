const ENDPOINT = 'https://tiktok-tts.weilnet.workers.dev';
const TEXT_BYTE_LIMIT = 287; // Update the character limit to 287

const textEncoder = new TextEncoder()

window.onload = () => {
	console.log("1");
    document.getElementById('charcount').textContent = `0/${TEXT_BYTE_LIMIT}`
    const req = new XMLHttpRequest()
    req.open('GET', `${ENDPOINT}/api/status`, false)
    req.send()

    let resp = JSON.parse(req.responseText)
    if (resp.data) {
        if (resp.data.available) {
            console.info(`${resp.data.meta.dc} (age ${resp.data.meta.age} minutes) is able to provide service`)
            enableControls()
        } else {
            console.error(`${resp.data.meta.dc} (age ${resp.data.meta.age} minutes) is unable to provide service`)
            setError(
                `Service not available${resp.data.message && resp.data.message.length > 1 ? ` (<b>"${resp.data.message}"</b>)` : ''}, try again later or check the <a href='https://github.com/Weilbyte/tiktok-tts'>GitHub</a> repository for more info`
                )
        }
    } else {
        setError('Error querying API status, try again later or check the <a href=\'https://github.com/Weilbyte/tiktok-tts\'>GitHub</a> repository for more info')
    }  
}

const setError = (message) => {
    clearAudio()
    document.getElementById('error').style.display = 'block'
    document.getElementById('errortext').innerHTML = message
}

const clearError = () => {
    document.getElementById('error').style.display = 'none'
    document.getElementById('errortext').innerHTML = 'There was an error.'
}

const setAudio = (base64, text) => {
    document.getElementById('success').style.display = 'block'
    document.getElementById('audio').src = `data:audio/mpeg;base64,${base64}`
    document.getElementById('generatedtext').innerHTML = `"${text}"`
}

const clearAudio = () => {
    document.getElementById('success').style.display = 'none'
    document.getElementById('audio').src = ``
    document.getElementById('generatedtext').innerHTML = ''
}

const disableControls = () => {
    document.getElementById('text').setAttribute('disabled', '')
    document.getElementById('voice').setAttribute('disabled', '')
    document.getElementById('submit').setAttribute('disabled', '')
}

const enableControls = () => {
    document.getElementById('text').removeAttribute('disabled')
    document.getElementById('voice').removeAttribute('disabled')
    document.getElementById('submit').removeAttribute('disabled')
}

const onTextareaInput = () => {
    const text = document.getElementById('text').value
    const textEncoded = textEncoder.encode(text)

    document.getElementById('charcount').textContent = `${textEncoded.length <= 999 ? textEncoded.length : 999}/${TEXT_BYTE_LIMIT}`

    if (textEncoded.length > TEXT_BYTE_LIMIT) {
        document.getElementById('charcount').style.color = 'red'
    } else {
        document.getElementById('charcount').style.color = 'black'
    }
}

const submitForm = async () => {
  clearError();
  clearAudio();

  disableControls();

  let text = document.getElementById('text').value;
  const textLength = new TextEncoder().encode(text).length;

  if (textLength === 0) text = 'The fungus among us.';
  const voice = document.getElementById('voice').value;

  if (voice == 'none') {
    setError('No voice has been selected');
    enableControls();
    return;
  }

  if (textLength > TEXT_BYTE_LIMIT) {
    try {
      const audioResponses = await generateAudioChunks(text, voice);
      const mergedAudio = mergeAudioChunks(audioResponses);
      setAudio(mergedAudio, text);
    } catch (error) {
      setError('Error generating audio. Please try again later.');
      console.log('Error:', error);
    }
  } else {
    try {
      const req = new XMLHttpRequest();
      req.open('POST', `${ENDPOINT}/api/generation`, false);
      req.setRequestHeader('Content-Type', 'application/json');
      req.send(
        JSON.stringify({
          text: text,
          voice: voice,
        })
      );

      let resp = JSON.parse(req.responseText);
      if (resp.data === null) {
        setError(`<b>Generation failed</b><br/> ("${resp.error}")`);
      } else {
        setAudio(resp.data, text);
      }
    } catch {
      setError('Error submitting form. Please try again later.');
    }
  }

  enableControls();
};

const generateAudioChunks = async (text, voice) => {
  const chunks = splitTextIntoChunks(text, TEXT_BYTE_LIMIT);
  const audioResponses = [];

  for (const chunk of chunks) {
    try {
      const req = new XMLHttpRequest();
      req.open('POST', `${ENDPOINT}/api/generation`, false);
      req.setRequestHeader('Content-Type', 'application/json');
      req.send(
        JSON.stringify({
          text: chunk,
          voice: voice,
        })
      );

      let resp = JSON.parse(req.responseText);
      if (resp.data === null) {
        throw new Error(`Generation failed for chunk: "${chunk}"`);
      } else {
        audioResponses.push(resp.data);
      }
    } catch (error) {
      throw error;
    }
  }

  return audioResponses;
};

const splitTextIntoChunks = (text, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

const mergeAudioChunks = (audioResponses) => {
  // Assuming the audioResponses array contains base64-encoded audio chunks
  // You'll need to join the audio chunks together to create the complete audio file.
  // The specifics of joining will depend on the format of the audio data.
  // For example, if they are MP3 files, you can concatenate the base64 strings,
  // decode them, and then create a new base64 string for the complete audio.
  // Ensure that the order of the audio chunks is maintained to get the correct result.
  // Please note that I'm assuming the API responses provide base64 audio chunks.

  // Example implementation (if audioResponses contains raw base64 audio data):
  const mergedAudioData = audioResponses.join('');
  const mergedAudio = `data:audio/mpeg;base64,${mergedAudioData}`;

  return mergedAudio;
};