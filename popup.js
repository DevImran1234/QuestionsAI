document.getElementById("submitButton").addEventListener("click", function(event) {
    event.preventDefault();  // Prevent form submission

    chrome.storage.local.get("answersContent", (data) => {
        if (data.answersContent && data.answersContent.length > 0) {
            updateAnswerList(data.answersContent);  // Display stored answers if any
        }
        toggleButtonsVisibility();  // Ensure the buttons are correctly shown/hidden
    });

    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];  // Get the selected file

    const spinner = document.getElementById("spinner"); // Get spinner element
    spinner.style.display = "block";  // Show the spinner when submit button is clicked

    if (file && file.name.endsWith(".docx")) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const arrayBuffer = e.target.result;

            // Use JSZip to unzip the .docx file
            JSZip.loadAsync(arrayBuffer)
                .then(function(zip) {
                    return zip.file("word/document.xml").async("string");
                })
                .then(function(text) {
                    // Parse the XML content
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "application/xml");

                    let extractedText = '';
                    const textElements = xmlDoc.getElementsByTagName("w:t");

                    for (let i = 0; i < textElements.length; i++) {
                        extractedText += textElements[i].textContent + " ";
                    }

                    extractedText = extractedText.replace(/\s+/g, ' ').trim();
                    console.log("Extracted text:", extractedText);

                    const allquestions = extractedText;

                    const apiKey = 'Your Api key here';

                    const answersContent = document.getElementById("answersContent");
                    answersContent.innerHTML = '';  // Clear previous answers

                    fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: "gpt-3.5-turbo",
                            messages: [{ role: "user", content: "read following allquestions and allanswer them all, give me results in nice clean formatting where you state allquestion first and then its allanswer, response should be an html where allquestion is heading3 and answer is simple paragraph, here is the content"+allquestions }]
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.choices && data.choices.length > 0) {
                            const answer = data.choices[0].message.content.trim();
                            answersContent.innerHTML += answer;  // Append the answers
                            
                            // Store the answers in chrome storage
                            chrome.storage.local.set({ answersContent: answersContent.innerHTML }, () => {
                                console.log("Answers saved.");
                            });
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching from OpenAI API:", error);
                    })
                    .finally(() => {
                        spinner.style.display = "none";  // Hide spinner after fetching
                    });

                    const answerPopup = document.getElementById("answerPopup");
                    answerPopup.style.display = "block";  // Display the popup
                })
                .catch(function(err) {
                    console.error("Error extracting .docx file:", err);
                    spinner.style.display = "none";  // Hide spinner in case of error
                });
        };

        reader.readAsArrayBuffer(file);
    } else {
        console.log("Please upload a valid .docx file.");
        spinner.style.display = "none";  // Hide spinner if no valid file
    }
});

// Handle clearing of answers
document.getElementById("clearData").addEventListener("click", function() {
    chrome.storage.local.set({ answersContent: [] }, () => {
        console.log("Answers cleared from storage.");
    });

    const answersContent = document.getElementById("answersContent");
    answersContent.innerHTML = '';  // Clear displayed answers

    const answerPopup = document.getElementById("answerPopup");
    answerPopup.style.display = "none";  // Hide the popup
});

// Load stored answers when the popup is opened
chrome.storage.local.get("answersContent", (data) => {
    if (data.answersContent && data.answersContent.length > 0) {
        const answersContent = document.getElementById("answersContent");
        answersContent.innerHTML = data.answersContent;  // Load stored answers into popup
        document.getElementById("answerPopup").style.display = "block";  // Show popup if data exists
    }
});
