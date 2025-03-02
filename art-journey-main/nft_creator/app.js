import { Worker } from 'worker_threads';
import path from 'path';

function run(filePath) {
    const worker = new Worker('./nft_creator/compile-worker.js', {
        workerData: filePath,
    });

    return new Promise((resolve, reject) => {
        worker.on('message', (result) => {
            console.log("AKI CARAIO", result)
            resolve(result);
        });

        worker.on('error', (error) => {
            reject(error);
        });
    });
}

const filePath = process.argv[2];

(async () => {
    try {
        const result = await run(filePath);
        console.log("HOORAAYY", result);
    } catch (error) {
        console.error('Error FDP:', error);
    }
})();
