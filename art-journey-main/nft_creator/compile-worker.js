import { parentPort, workerData } from 'worker_threads';
import { loadImage } from "canvas";
import { OfflineCompiler } from "mind-ar/src/image-target/offline-compiler.js";
import { writeFile } from 'fs/promises';
import path from 'path';

const filePath = workerData;

new Promise(async (resolve, reject) => {
    try {
        const image = await loadImage(filePath);
        const compiler = new OfflineCompiler();
        await compiler.compileImageTargets([image], console.log);
        const buffer = compiler.exportData();

        const fileName = path.basename(filePath, path.extname(filePath));
        const targetMindPath = path.join('public', 'targets', `${fileName}.mind`);

        await writeFile(targetMindPath, buffer);
        resolve(targetMindPath);
    } catch (error) {
        reject(error);
    }
})
    .then((data) => {
        parentPort.postMessage({
            success: true,
            message: 'Worker Finished.',
            path: data
        });
    })
    .catch((error) => {
        parentPort.postMessage({
            success: false,
            message: `Worker Error: ${error.message}`,
        });
    });
