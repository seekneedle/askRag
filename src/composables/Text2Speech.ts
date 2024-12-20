import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
// 设置API密钥
const appid = "4823798285";
const access_token = "GmakIY6Um9DZgCQl7Rr0RJNfDukCJ8RB";
const cluster = "volcano_tts";
const language = "cn";
const voice_type = "BV700_V2_streaming";//"BV704_streaming"//
const emotion = "professional";
const api_url = `${config.api.ttsBaseUrl}/api/v1/tts`;

const header = {
    "Authorization": `Bearer;${access_token}`
};

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
        
        if (typeof base64 !== 'string') {
            console.error('base64 parameter must be a string, received:', typeof base64);
            return new ArrayBuffer(0);
        }

        // Remove any whitespace and check if the base64 string is valid
        

        const base64WithoutUrlSafe = base64.replace(/-/g, '+').replace(/_/g, '/');
        const cleanBase64 = base64WithoutUrlSafe.replace(/\s/g, '');
        // Check if the base64 string looks valid
        if (!cleanBase64 || !/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
            console.error('Invalid base64 string:', base64);
            return new ArrayBuffer(0);
        }

        // Use built-in base64 decoding methods
        const binaryString = window.atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
    } catch (error) {
        console.error('Error decoding base64:', error);
        return new ArrayBuffer(0);
    }
}

export async function generateSpeech(text: string, 
            sampleRate: number = 16000, 
            format: string = 'mp3', 
            rate: number = 1.0, 
            pitch: number = 1.0): Promise<ArrayBuffer> {
    // Validate input text
    if (!text || text.trim().length === 0) {
        console.warn('Empty text provided for speech generation');
        return Promise.resolve(new ArrayBuffer(0));
    }

    const requestJson = {
        app: {
            appid: appid,
            token: "access_token",
            cluster: cluster
        },
        user: {
            uid: "388808087185088"
        },
        audio: {
            voice_type: voice_type,
            emotion: emotion,
            encoding: format, // Ensure we use the passed format
            speed_ratio: rate,
            rate: sampleRate,
            volume_ratio: 1.0,
            pitch_ratio: pitch,
            language: language,
        },
        request: {
            reqid: uuidv4(),
            text: text,
            text_type: "plain",
            operation: "query",
            with_frontend: 1,
            frontend_type: "unitTson"
        }
    };

    // Validate input parameters
    if (!['mp3', 'wav', 'pcm'].includes(format)) {
        console.warn(`Unsupported audio format: ${format}. Defaulting to mp3.`);
        requestJson.audio.encoding = 'mp3';
    }

    return new Promise((resolve) => {
        axios.post(api_url, requestJson, { 
            headers: {
                ...header//,
                //'Content-Type': 'application/json',
                //'Accept': 'application/octet-stream'
            },             
        })
        .then(response => {
            // Log response details for debugging
            console.log('Speech Generation Response:', {
                status: response.status,
                headers: response.headers,
                dataLength: response.data ? response.data.byteLength : 0,
                dataType: response.data ? typeof response.data : 'undefined',
                data: response.data
            });

            // Validate the response data
            if (response.data) {
                //const responseJson = JSON.parse(JSON.stringify(response.data.data, null, 2));
                //console.log('Response JSON:', responseJson);

                const audioArrayBuffer = base64ToArrayBuffer(response.data.data);
                
                // Additional check to ensure we have a valid ArrayBuffer
                if (audioArrayBuffer.byteLength > 0) {            
                    resolve(audioArrayBuffer);
                } else {
                    console.warn('Failed to decode audio data:', {
                        originalData: response.data,
                        decodedBuffer: audioArrayBuffer
                    });
                    resolve(new ArrayBuffer(0));
                }
            } else {
                console.warn('Received invalid audio data:', {
                    data: response.data,
                    type: typeof response.data,
                    length: response.data ? response.data.byteLength : 'N/A'
                });
                resolve(new ArrayBuffer(0));
            }
        })
        .catch(error => {
            console.error('Speech Generation Error:', {
                message: error.message,
                response: error.response ? {
                    status: error.response.status,
                    data: error.response.data ? 
                        (error.response.data instanceof ArrayBuffer ? 
                            `ArrayBuffer(${error.response.data.byteLength} bytes)` : 
                            typeof error.response.data) 
                        : 'No data'
                } : 'No response',
                config: error.config
            });
            resolve(new ArrayBuffer(0));
        });
    });
}