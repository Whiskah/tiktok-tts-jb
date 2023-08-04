const ENDPOINT = 'https://tiktok-tts.weilnet.workers.dev'

const TEXT_BYTE_LIMIT = 287
const textEncoder = new TextEncoder()

window.onload = () => {
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

// Function to split the text into chunks of size TEXT_BYTE_LIMIT
const splitTextIntoChunks = (text) => {
    const chunks = [];
    let chunk = '';
    const words = text.split(' ');

    for (const word of words) {
        if (chunk.length + word.length + 1 <= TEXT_BYTE_LIMIT) {
            chunk += word + ' ';
        } else {
            chunks.push(chunk.trim());
            chunk = word + ' ';
        }
    }

    if (chunk.length > 0) {
        chunks.push(chunk.trim());
    }

    return chunks;
};

const submitForm = async () => {
    clearError()
    clearAudio()

    disableControls()

    let text = document.getElementById('text').value
    const textLength = new TextEncoder().encode(text).length

    if (textLength === 0) text = 'The fungus among us.' 
    const voice = document.getElementById('voice').value

    if (voice == "none") {
        setError("No voice has been selected");
        enableControls()
        return
    }

    if (textLength > TEXT_BYTE_LIMIT) {
        setError(`Text must not be over ${TEXT_BYTE_LIMIT} UTF-8 characters (currently at ${textLength})`)
        enableControls()
        return
    }

    try {
        // Show the loading popup while waiting for the audio response
        showLoadingPopup();

        const textChunks = splitTextIntoChunks(text);

        // Initialize an array to store the audio responses
        const audioResponses = [];

        for (const chunk of textChunks) {
            const req = new XMLHttpRequest();
            req.open('POST', `${ENDPOINT}/api/generation`, false);
            req.setRequestHeader('Content-Type', 'application/json');

            const chunkResponse = await new Promise((resolve, reject) => {
                req.onreadystatechange = () => {
                    if (req.readyState === XMLHttpRequest.DONE) {
                        if (req.status === 200) {
                            resolve(req.responseText);
                        } else {
                            reject(new Error('Audio request failed'));
                        }
                    }
                };

                req.send(JSON.stringify({
                    text: chunk,
                    voice: voice
                }));
            });

            audioResponses.push(chunkResponse);
        }

        // Join the audio responses and set the audio
        const fullAudio = audioResponses.join('');
        setAudio(fullAudio, text);
    } catch (error) {
        setError('Error submitting form (printed to F12 console)');
        console.log('^ Please take a screenshot of this and create an issue on the GitHub repository if one does not already exist :)');
        console.log('If the error code is 503, the service is currently unavailable. Please try again later.');
        console.log(`Voice: ${voice}`);
        console.log(`Text: ${text}`);
    }

    // Hide the loading popup after the audio response is received
    hideLoadingPopup();

    enableControls();
};

// Function to show the loading popup
const showLoadingPopup = () => {
    document.getElementById('loading').style.display = 'flex';
};

// Function to hide the loading popup
const hideLoadingPopup = () => {
    document.getElementById('loading').style.display = 'none';
};
