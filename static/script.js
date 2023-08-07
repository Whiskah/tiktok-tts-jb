const ENDPOINT = 'https://tiktok-tts.weilnet.workers.dev'

const TEXT_BYTE_LIMIT = 300
const CHUNK_BYTE_LIMIT = 290

const textEncoder = new TextEncoder()

let countdownInterval; // Global variable to hold the interval ID for the countdown timer

window.onload = () => {
	console.log("7");
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

const showLoadingOverlay = () => {
  document.getElementById('loading-overlay').style.display = 'flex';
};

const hideLoadingOverlay = () => {
  document.getElementById('loading-overlay').style.display = 'none';
};

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

const submitForm = () => {
  clearError();
  clearAudio();
  showLoadingOverlay(); // Show loading overlay immediately

  setTimeout(() => { // Add a delay to give time for the loading overlay to show
    let text = document.getElementById('text').value;
    const textLength = new TextEncoder().encode(text).length;

    if (textLength === 0) text = 'The fungus among us.';
    const voice = document.getElementById('voice').value;

    if (voice == "none") {
      hideLoadingOverlay(); // Hide loading overlay in case of error
      setError("No voice has been selected");
      enableControls();
      return;
    }

    if (textLength > TEXT_BYTE_LIMIT) {
      processLongText(text, voice);
    } else {
      generateAudio(text, voice);
    }
  }, 100); // Adjust the delay as needed
};

const processLongText = (text, voice) => {
    const chunks = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
        const chunk = text.slice(currentIndex, currentIndex + CHUNK_BYTE_LIMIT);
        chunks.push(chunk);
        currentIndex += CHUNK_BYTE_LIMIT;
    }

    const audioData = [];

    const processNextChunk = (index) => {
        if (index >= chunks.length) {
            const mergedAudio = audioData.join('');
            setAudio(mergedAudio, text);
            enableControls();
            return;
        }

        generateAudio(chunks[index], voice, (base64Audio) => {
            audioData.push(base64Audio);
            processNextChunk(index + 1);
        });
    };

    processNextChunk(0);
};

const generateAudio = (text, voice, callback = null) => {
  // Remove special characters using regular expression encodeURIComponent breaks it
  const cleanedText = text.replace(/[^\w\s]/g, '');

  try {
    const req = new XMLHttpRequest();
    req.open('POST', `${ENDPOINT}/api/generation`, false);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify({
      text: cleanedText, // Use the cleaned text
      voice: voice
    }));

    const respText = req.responseText;
    const respData = JSON.parse(respText);
    if (respData.data === null) {
      setError(`<b>Generation failed</b><br/> ("${respData.error}")`);
    } else {
      if (callback) {
        callback(respData.data);
      } else {
        setAudio(respData.data, text);
      }
    }
	
	hideLoadingOverlay(); // Hide loading overlay	

  } catch {
	hideLoadingOverlay(); // Hide loading overlay in case of error
    setError('Error submitting form (printed to F12 console)');
    console.log('^ Please take a screenshot of this and create an issue on the GitHub repository if one does not already exist :)');
    console.log('If the error code is 503, the service is currently unavailable. Please try again later.');
    console.log(`Voice: ${voice}`);
    console.log(`Text: ${text}`);
  }
};


