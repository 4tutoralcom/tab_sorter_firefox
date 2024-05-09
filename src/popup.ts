document.addEventListener("DOMContentLoaded", () => {
    const urlForm = document.getElementById("urlForm") as HTMLFormElement;
    const urlsContainer: HTMLElement = document.getElementById("urlsContainer") as HTMLElement;
    if(!urlsContainer){
        return;
    }

    // Counter to keep track of the number of input fields
    let urlFieldCount = 0;

    // Function to create a new input field
    function createUrlField(value?: string): void {
        const label = document.createElement("label");
        label.setAttribute("for", `url${urlFieldCount}`);
        label.textContent = `URL ${urlFieldCount}:`;
        
        const input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("id", `url${urlFieldCount}`);
        input.setAttribute("name", `url${urlFieldCount}`);
        input.value = value || ''; // Set value if provided
        
        const br = document.createElement("br");
        
        // Append the new elements to the container
        urlsContainer.appendChild(label);
        urlsContainer.appendChild(input);
        urlsContainer.appendChild(br);
        
        // Increment the counter
        urlFieldCount++;
    }

    // Add event listener to the "Add URL Field" button
    const addUrlFieldButton = document.getElementById("addUrlField") as HTMLElement;
    if(!addUrlFieldButton){
        return;
    }
    addUrlFieldButton.addEventListener("click", () => {
        createUrlField();
    });

    // Form submission
    urlForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Prevent the form from submitting

        const formData = new FormData(urlForm);
        const urls: string[] = [];

        // Get values from form fields
        for (const pair of formData.entries()) {
            urls.push(pair[1] as string);
        }

        // Send URLs to background script
        browser.runtime.sendMessage({ action: "saveURLs", urls: urls });

        // Close the popup
        window.close();
    });

    // Function to populate the form with URLs from storage
    function populateFormWithUrls(urls: string[]): void {
        urls.forEach((url, index) => {
            createUrlField(url);
        });
    }

    // Retrieve URLs from storage when popup is opened
    browser.storage.sync.get("urls").then(result => {
        const urls: string[] = result.urls || [];
        console.log("URLs retrieved from storage:", urls);
        populateFormWithUrls(urls);
    }).catch(error => {
        console.error("Error retrieving URLs:", error);
    });
});
