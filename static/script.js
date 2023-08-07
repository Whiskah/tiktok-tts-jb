const ENDPOINT = 'https://tiktok-tts.weilnet.workers.dev'

const TEXT_BYTE_LIMIT = 300
const CHUNK_BYTE_LIMIT = 290

const textEncoder = new TextEncoder()

let countdownInterval; // Global variable to hold the interval ID for the countdown timer
let totalRequests; // Loading popups number of requests

window.onload = () => {
	console.log("13");
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

const setAudioAsync = async (base64, text) => {
    document.getElementById('success').style.display = 'block'
    document.getElementById('audio').src = `data:audio/mpeg;base64,${base64}`
    document.getElementById('generatedtext').innerHTML = `"${text}"`
};

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

const showLoadingPopup = () => {
  document.getElementById('loading-popup').style.display = 'block';
};

const hideLoadingPopup = () => {
  document.getElementById('loading-popup').style.display = 'none';
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

const normalizeText = (text) => {
    // Replace smart quotes with straight quotes
    text = text.replace(/[\u2018\u2019]/g, "'");
    text = text.replace(/[\u201C\u201D]/g, '"');

    // Replace other special characters as needed
    // For example, replace em dashes with double hyphens
    text = text.replace(/\u2013/g, '--');
    
    // You can add more replacements as needed

    return text;
};

const submitForm = () => {
    clearError();
    clearAudio();

    disableControls();

    let text = document.getElementById('text').value;
    text = normalizeText(text); // Call a function to normalize the text

    const textLength = new TextEncoder().encode(text).length;
    console.log(textLength);

    if (textLength === 0) text = 'The fungus among us.'; 
    const voice = document.getElementById('voice').value;

    if (voice == "none") {
        setError("No voice has been selected");
        enableControls();
        return;
    }

    if (textLength > TEXT_BYTE_LIMIT) {
        processLongTextAsync(text, voice); // Use the async version for long text
    } else {
        generateAudioAsync(text, voice); // Use the async version for short text
    }
    hideLoadingPopup();
};

const processLongTextAsync = async (text, voice) => {
    const words = text.split(/\s+/); // Split text into words using space as delimiter
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
        if (currentChunk.length + word.length + 1 <= CHUNK_BYTE_LIMIT) { // +1 for space
            if (currentChunk) {
                currentChunk += ' ' + word; // Add space before adding the word
            } else {
                currentChunk = word;
            }
        } else {
            chunks.push(currentChunk);
            currentChunk = word;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    const audioData = [];

    const processNextChunk = async (index) => {
        if (index >= chunks.length) {
            const mergedAudio = audioData.join('');
            setAudioAsync(mergedAudio, text);
            enableControls();
            return;
        }

        await generateAudioAsync(chunks[index], voice, (base64Audio) => {
            audioData.push(base64Audio);
        });

        processNextChunk(index + 1);
    };

    await processNextChunk(0);
};

const generateAudioAsync = async (text, voice, callback = null) => {
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
        await callback(resp.data);
      } else {
        await setAudioAsync(resp.data, text); // Use an asynchronous version of setAudio
      }
    }
  } catch {
    setError('Error submitting form (printed to F12 console)');
    // ...
  }
};

document.addEventListener('DOMContentLoaded', () => {
    // Call submitForm to start the process
    document.getElementById('submit').addEventListener('click', submitForm);
    
});

