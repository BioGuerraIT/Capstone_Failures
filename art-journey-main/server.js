// server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const { NovitaSDK, TaskStatus } = require("novita-sdk");
const FFmpeg = require('ffmpeg');
const { exec } = require('child_process');
const { removeBackground } = require('@imgly/background-removal-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up static files directory
app.use(express.static('public'));

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Initialize NovitaSDK and FFmpeg
const novitaClient = new NovitaSDK("fea2fd75-add3-4614-b90f-cd5743049567");


// Endpoint for generating AR experience
app.post('/generate-ar', upload.single('image'), async (req, res) => {
    try {
        // Read image file
        const imageBuffer = fs.readFileSync(req.file.path);
        const imagePath = path.join('uploads', req.file.filename);
        const imageData = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        const imageName = path.basename(imagePath, path.extname(imagePath));
        // Remove background from the image and save it
        console.log("Removing background from image...");
        const resultDataURL = await removeImageBackground('./public/uploads/art2.png');

        // Writing the result to a file (optional)
        const resultImagePath = path.join('public', 'assets', `${imageName}.png`);
        fs.writeFileSync(resultImagePath, resultDataURL.split(';base64,').pop(), { encoding: 'base64' });
        // Create NFT marker
        console.log("Creating NFT Marker...")
        // const nftFilePath = await createNFTMarker(imagePath);
        const nftFilePath = "targets/berlin_art_1.mind"
        // Generate video
        // const videoPath = await generateVideo(imageData, imagePath);
        let videoPath = 'animations/berlin_art_1.mp4'

        // Respond with link for the AR experience
        const arLink = `http://localhost:${PORT}/ar-view?video=${encodeURIComponent(videoPath)}&marker=${encodeURIComponent(nftFilePath)}$asset=${encodeURIComponent(removedImagePath)}`;
        console.log("AAAA", arLink)
        res.status(200).send(arLink);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error.');
    }
});

// Route for AR view
app.get('/ar-view', (req, res) => {
    const { video, marker, asset } = req.query;
    const arHTML = `
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
    </head>
    <body>
        <a-scene mindar-image="imageTargetSrc: ${marker};" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
            <a-video src="${video}" position="0 0 0" height="1.1" width="1.1" rotation="0 0 0" loop></a-video>
            <a-image src="${asset}" width="0.2" height="0.2" position="${getRandomPosition()}" rotation="0 0 0"></a-image>

        </a-entity>
        </a-scene>
        <script>
            // Function to generate a random position for the image
            function getRandomPosition() {
                const x = Math.random() > 0.5 ? Math.random() * 2 - 1 : -(Math.random() * 2 - 1);
                const y = Math.random() > 0.5 ? Math.random() * 2 - 1 : -(Math.random() * 2 - 1);
                const z = -2; // Adjust the z position to be in front of the camera
                return x + ' ' + y + ' ' + z;
            }
        </script>
    </body>
    </html>
    `;
    res.send(arHTML);
});

// Function to remove background from an image
async function removeImageBackground(imageBuffer) {
    try {
        // Removing background
        const blob = await removeBackground(imageBuffer);

        // Converting Blob to buffer
        const buffer = Buffer.from(await blob.arrayBuffer());

        // Generating data URL
        const dataURL = `data:image/png;base64,${buffer.toString("base64")}`;
        
        // Returning the data URL
        return dataURL;
    } catch (error) {
        // Handling errors
        throw new Error('Error removing background: ' + error);
    }
}



// Function to create NFT marker
function createNFTMarker(imagePath) {
    return new Promise((resolve, reject) => {
        const command = `node nft_creator/app.js ./public/${imagePath}`;
        exec(command, (error, stdout, stderr) => {
            
            const imageName = path.basename(imagePath, path.extname(imagePath));
            const mindFilePath = `targets/${imageName}.mind`;
            console.log('NFT marker created successfully:', mindFilePath);
            resolve(mindFilePath);
            
        });
    });
}

async function generateVideo(imageData, imagePath) {
    try {
        const imageName = path.basename(imagePath, path.extname(imagePath));
        // Generate video using NovitaSDK
        const videoGenerationParams = {
            model_name: "SVD-XT",
            image_file: imageData, // Base64-encoded image data
            frames_num: 25,
            frames_per_second: 6,
            seed: 134512546,
            image_file_resize_mode: "ORIGINAL_RESOLUTION",
            steps: 23,
        };
        const videoGenerationResponse = await novitaClient.img2Video(videoGenerationParams);

        if (!videoGenerationResponse || !videoGenerationResponse.task_id) {
            throw new Error('Failed to initiate video generation.');
        }

        // Check progress until video generation is completed
        let videoProgressResponse;
        do {
            videoProgressResponse = await novitaClient.progressV3({ task_id: videoGenerationResponse.task_id });
            if (videoProgressResponse.task.status === TaskStatus.FAILED) {
                throw new Error('Video generation failed.');
            }
            if (videoProgressResponse.task.status === TaskStatus.QUEUED) {
                console.log("Video generation is queued...");
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
        } while (videoProgressResponse.task.status !== TaskStatus.SUCCEED);

        console.log("Video generation completed successfully.");

        // Fetch the generated video URL
        const videoUrl = videoProgressResponse.videos[0]?.video_url; // Extract video URL from response

        console.log(videoUrl)
        if (!videoUrl) {
            throw new Error('Failed to get video URL.');
        }

        // Fetch the generated video data
        const videoData = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        const videoBuffer = Buffer.from(videoData.data);

        // Save the video buffer to a file
        const videoPath = path.join(__dirname, 'public', 'animations', `${imageName}.mp4`);
        fs.writeFileSync(videoPath, videoBuffer);

        return `animations/${imageName}.mp4`; // Return video path
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to generate video.');
    }
}


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
