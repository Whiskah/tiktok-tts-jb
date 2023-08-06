const ENDPOINT = 'https://tiktok-tts.weilnet.workers.dev'

const TEXT_BYTE_LIMIT = 300
const CHUNK_BYTE_LIMIT = 290

const textEncoder = new TextEncoder()

let countdownInterval; // Global variable to hold the interval ID for the countdown timer

window.onload = () => {
	console.log("2");
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

const showLoadingScreen = () => {
  document.getElementById('loading-screen').style.display = 'flex';
  let countdown = 5; // Set the countdown time in seconds
  document.getElementById('countdown-timer').textContent = ` (${countdown})`;

  // Update the countdown timer every second
  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown >= 0) {
      document.getElementById('countdown-timer').textContent = ` (${countdown})`;
    }
  }, 1000);
};

// Function to hide the loading screen
const hideLoadingScreen = () => {
  clearInterval(countdownInterval); // Clear the countdown interval
  document.getElementById('loading-screen').style.display = 'none';
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
    
    disableControls();
    
    // Show the loading screen while waiting for API requests
    showLoadingScreen();
    
    let text = document.getElementById('text').value;
    const textLength = new TextEncoder().encode(text).length;
    console.log(textLength);
    
    if (textLength === 0) text = 'The fungus among us.';
    const voice = document.getElementById('voice').value;
    
    if (voice == 'none') {
      setError('No voice has been selected');
      enableControls();
      hideLoadingScreen(); // Hide the loading screen if there's an error
      return;
    }
    
    if (textLength > TEXT_BYTE_LIMIT) {
      processLongText(text, voice);
    } else {
      generateAudio(text, voice);
    }
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
    try {
        const req = new XMLHttpRequest();
        req.open('POST', `${ENDPOINT}/api/generation`, false);
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify({
            text: text,
            voice: voice
        }));

        let resp = JSON.parse(req.responseText);
        if (resp.data === null) {
            setError(`<b>Generation failed</b><br/> ("${resp.error}")`);
        } else {
            if (callback) {
                callback(resp.data);
            } else {
                setAudio(resp.data, text);
            }
        }  
    } catch {
        setError('Error submitting form (printed to F12 console)');
        console.log('^ Please take a screenshot of this and create an issue on the GitHub repository if one does not already exist :)');
        console.log('If the error code is 503, the service is currently unavailable. Please try again later.');
        console.log(`Voice: ${voice}`);
        console.log(`Text: ${text}`);
    }
};
