document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const imageUpload = document.getElementById('imageUpload');
    const artInfo = document.getElementById('artInfo');
    const arLinkContainer = document.getElementById('arLinkContainer');

    generateBtn.addEventListener('click', async () => {
        // Validate inputs
        if (!imageUpload.files[0]) {
            alert('Please select an image to upload.');
            return;
        }
    
        // Prepare form data
        const formData = new FormData();
        formData.append('image', imageUpload.files[0]);
        formData.append('artInfo', artInfo.value);
    
        try {
            // Send POST request to server for AR generation
            const response = await fetch('/generate-ar', {
                method: 'POST',
                body: formData,
                // No need to specify content type here, it's handled by FormData
            });
    
            if (response.ok) {
                // Process the response
                const arLink = await response.text();
                // Create button dynamically
                const arButton = document.createElement('a');
                arButton.href = arLink;
                arButton.textContent = 'View AR Experience';
                arButton.target = '_blank'; // Open link in a new tab
                // Append button to container
                arLinkContainer.innerHTML = ''; // Clear previous content
                arLinkContainer.appendChild(arButton);
            } else {
                alert('Failed to generate AR experience.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while generating AR experience.');
        }
    });
});
