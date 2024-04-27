const { PDFDocument } = require('pdf-lib');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const { Readable } = require('stream');
const { google } = require('googleapis');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
// npm i qrcode-terminal whatsapp-web.js stream googleapis mongodb fs wwebjs-mongo mongoose
// const {Buttons}= require('./index');
// npm install github:pedroslopez/whatsapp-web.js#webpack-exodus
const apikeys = require('./apikeys.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];
async function mergePDFs(pendingPDFs) {
    const mergedPdfDoc = await PDFDocument.create();

    for (const pdfData of pendingPDFs) {
        const pdfDoc = await PDFDocument.load(pdfData);
        const pages = await mergedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        for (const page of pages) {
            mergedPdfDoc.addPage(page);
        }
    }

    return await mergedPdfDoc.save();
}



async function authorize() {
    const jwtClient = new google.auth.JWT(
        apikeys.client_email,
        null,
        apikeys.private_key,
        SCOPE
    );

    await jwtClient.authorize();

    return jwtClient;
}

async function uploadFile(authClient, base64Data, fileName, folderId) {
    return new Promise((resolve, rejected) => {
        const drive = google.drive({ version: 'v3', auth: authClient });

        const fileMetaData = {
            name: fileName,
            parents: [folderId]
        };
        const bufferStream = new Readable();
        bufferStream.push(Buffer.from(base64Data, 'base64'));
        bufferStream.push(null);

        drive.files.create({
            resource: fileMetaData,
            media: {
                body: bufferStream,
                mimeType: 'application/octet-stream'
            },
            fields: 'id'
        }, function (error, file) {
            if (error) {
                return rejected(error)
            }
            resolve(file);
        })
    });
}



// const client = new Client({
//     authStrategy: new LocalAuth(),
// });
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.CHROME_BIN || undefined,
        headless: true,
        args: ['--no-sandbox']
    }
});


client.on('qr', async qr => {
    //qrcode.generate(qr, { small: true });
    //console.log('qr', qr);
    const pairingCode = await client.requestPairingCode("916238261633");
    console.log("QR received");
    console.log(pairingCode);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

let db;

async function connectToDB() {
    const uri = 'mongodb+srv://abel:abel@cluster0.iqgx2js.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    const client = new MongoClient(uri);

    try {
        await client.connect();
        db = client.db('ezprints');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

async function insertFilenameToDB(filename,collectionName) {
    try {
        const collection = db.collection(collectionName);
        await collection.insertOne({ name: filename });
        console.log('Filename inserted into database:', filename);
    } catch (error) {
        console.error('Ntho preshnm');
    }
}
let pendingPDFs = [];
let originalFileName;
let mergemedia;
client.on('message', async message => {
  const senderPhoneNumber = message.from;
  const phoneNumberDigits = senderPhoneNumber.replace(/\D/g, '').slice(-10);
  const collectionName = phoneNumberDigits;
  console.log('Sender phone number:', phoneNumberDigits);
    // if (message.hasMedia ) {
    if (message.body === 'print' && message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (quotedMsg.hasMedia) {
           const media = await quotedMsg.downloadMedia();
        //const media = await message.downloadMedia();
        if(media.filename!=null && media.filename.endsWith('.pdf')) {
            const base64Data = media.data;
            const fileName = media.filename;
            async function createCollectionIfNotExists(collectionName) {
            const collections = await db.listCollections().toArray();
            const collectionExists = collections.some(collection => collection.name === collectionName);
            if (!collectionExists) {
                await db.createCollection(collectionName);
                console.log('Collection created:', collectionName);
            }
            }
            
            // Insert filename into the collection
            createCollectionIfNotExists(collectionName)
            .then(() => insertFilenameToDB(media.filename,collectionName))
            .catch(error => console.error('Error creating collection or inserting filename:', error));
            // const folderId = '15fhDr2SHWaN0mARKhqzl6KDGKwBn9a1m';
            const folderId = '1d0HXC7KlRY1kQ87pHwT1aDcnazj5z8HB';


            authorize().then(authClient => {

                return uploadFile(authClient, base64Data, fileName, folderId);
            })
                .then(uploadedFile => {
                    console.log('File uploaded:', media.filename);
                    message.reply('*File uploaded and ready to print.*');
                    // const chat = message.getChat();
                    // console.log(chat);
                    // Prompt user for number of copies and color preference
                    
                    // Listen for the user's response
                    // client.on('message', async responseMessage => {
                    //     if (responseMessage.body && responseMessage.from === message.from) {
                    //         const numberOfCopies = parseInt(responseMessage.body);
                            
                    //         if (!isNaN(numberOfCopies)) {
                    //             // Now prompt for color preference
                    //             responseMessage.reply('Do you want the copies in black and white or color? Please type "bw" for black and white or "color" for color.');
                    //             console.log(numberOfCopies);
                    //             // Listen for color preference
                    //             client.on('message', async colorMessage => {
                    //                 if (colorMessage.body && colorMessage.from === message.from) {
                    //                     const colorPreference = colorMessage.body.toLowerCase();
                    //                     console.log(colorPreference);
                    //                     if (colorPreference === 'bw' || colorPreference === 'color') {
                    //                         // Now you have both number of copies and color preference
                    //                         // You can proceed with further actions based on this information
                    //                         // For example, you can store this information in the database
                    //                         // Or you can reply to the user confirming their choices
                    //                         colorMessage.reply(`You requested ${numberOfCopies} ${colorPreference === 'bw' ? 'black and white' : 'color'} copies.`);
                    //                     } else {
                    //                         console.log('Invalid input.');
                    //                     }
                    //                 }
                    //             });
                    //         }
                    //     }
                    // });
                
                    // Insert filename into MongoDB
                    insertFilenameToDB(media.filename);
            })
        
            .catch(error => {
                console.error('Error:', error);
            });
        }
    }
    }
    else if (message.hasMedia) {
        const media = await message.downloadMedia();
        mergemedia=media;
        if (media.filename.endsWith('.pdf')) {
            const base64Data = media.data;
            originalFileName=media.filename;
            const uint8Array = Uint8Array.from(Buffer.from(base64Data, 'base64'));
            pendingPDFs.push(uint8Array);
            console.log("PDF added to merge queue.");
            message.react('✅');
        //  message.reply('PDF added to merge queue.');
            
        } else {
            message.reply('The quoted message is not a PDF document.');
        }
         
    } 
    else if(message.body === 'merge') {
        if (pendingPDFs.length < 2) {
            message.reply('Please send at least two PDFs before merging.');
        } else {
            // Call the mergePDFs function with the pendingPDFs array
            const mergedPDF = await mergePDFs(pendingPDFs);
            
            
            
            if (mergedPDF) {
                
                // const folderId = '1d0HXC7KlRY1kQ87pHwT1aDcnazj5z8HB'; // Replace with your folder ID
                const authClient = await authorize();
                async function createCollectionIfNotExists(collectionName) {
                    const collections = await db.listCollections().toArray();
                    const collectionExists = collections.some(collection => collection.name === collectionName);
                    if (!collectionExists) {
                        await db.createCollection(collectionName);
                        console.log('Collection created:', collectionName);
                    }
                    }
                    const mergedFileName = `${originalFileName.split('.')[0]}-merged.pdf`;
                    const base64MergedPDF = Buffer.from(mergedPDF).toString('base64');
                    
                    // Insert filename into the collection
                    createCollectionIfNotExists(collectionName)
                    
                    .then(() => insertFilenameToDB(mergedFileName,collectionName))
                    .catch(error => console.error('Error creating collection or inserting filename:', error));
                    // const folderId = '15fhDr2SHWaN0mARKhqzl6KDGKwBn9a1m';
                    const folderId = '1d0HXC7KlRY1kQ87pHwT1aDcnazj5z8HB';
        
        
                    // Inside the if block where a PDF file is processed and uploaded
                    authorize()
                    .then(authClient => {
                        // Pass originalFileName to the uploadFile function
                        return uploadFile(authClient, base64MergedPDF, mergedFileName, folderId);
                    })
                    .then(uploadedFile => {
                        console.log('File uploaded:', mergedFileName); // Log originalFileName instead of media.filename
                        //message.reply('*File uploaded.*\nHow many copies do you need? Please enter a number');
                        insertFilenameToDB(mergedFileName);
                    })
                    .catch(error => {
                        console.error('Error uploading file:', error);
                    });

                // message.reply('Merged PDF uploaded to Google Drive.');
                mergemedia.filename=mergedFileName;
                mergemedia.data=base64MergedPDF;
                client.sendMessage(message.from, mergemedia, { caption: 'Here\'s your merged pdf.' });
            } else {
                message.reply('Error merging PDFs.');
            }
        }
    }
    // } else if (message.hasQuotedMsg && message.hasMedia) {
    //     const quotedMsg = await message.getQuotedMessage();
    //     if (quotedMsg.hasMedia && quotedMsg.type === 'document') {
    //         const media = await quotedMsg.downloadMedia();
    //         if (media.filename && media.filename.endsWith('.pdf')) {
    //             pendingPDFs.push(media.data);
    //             message.reply('PDF added to merge queue.');
    //         } else {
    //             message.reply('The quoted message is not a PDF document.');
    //         }
    //     } else {
    //         message.reply('The quoted message does not contain any media or is not a document.');
    //     }
    // } 
        else if (message.body === 'ping') {
        message.reply('pong');
        console.log('ping message recevied');
    } else if (message.body === 'nadako') {
        message.reply('avo');
        message.react('🚶');
    } else if (message.body === '!anand') {
        message.reply('ni eatha!');
        // message.react('🖕');
    } else if(message.body==='!erajhipo'){
        // message.reply('ninte achan');
        message.reply('LocalAuth loggingout.');
    } else if (message.body === '!epadida') {
        message.reply('unnal mudiyath thambi!');
        message.react('😙');
    }
    
});

(async () => {
    await connectToDB();
    await client.initialize();
})();


