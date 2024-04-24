//const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, List } = require('whatsapp-web.js');
const { Readable } = require('stream');
const { google } = require('googleapis');
const { MongoClient } = require('mongodb');
const fs = require('fs');
import puppeteer from 'puppeteer';
// const { MongoStore } = require('wwebjs-mongo');
//const mongoose = require('mongoose');
// npm i qrcode-terminal whatsapp-web.js stream googleapis mongodb fs wwebjs-mongo mongoose
// const {Buttons}= require('./index');
// client.sendMessage('xxxxxxxxxx@c.us', 'Hello Word!');
const apikeys = require('./apikeys.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];

async function authorize() {
    const jwtClient = new google.auth.JWT(
        apikeys.client_email,
        null,
        apikeys.private_key,
        SCOPEindex1.js
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
const client = new Client({
    authStrategy: new LocalAuth(),
});


// client.on('qr', qr => {
//     qrcode.generate(qr, { small: true });
//     qrcode.error

//     console.log('qr', qr);
//     uploadqr(authClient,qr);
// });

client.on('qr', async qr => {
    console.log('QR RECEIVED');
    const pairingCode = await client.requestPairingCode("916238261633");
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
client.on('message', async message => {
  const senderPhoneNumber = message.from;
  const phoneNumberDigits = senderPhoneNumber.replace(/\D/g, '').slice(-10);
  const collectionName = phoneNumberDigits;
  console.log('Sender phone number:', phoneNumberDigits);
    //if (message.hasMedia ) {
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
                    message.reply('*File uploaded.*\nHow many copies do you need? Please enter a number');
                    client.on('message', async responseMessage => {
                        if (responseMessage.body && responseMessage.from === message.from) {
                            const numberOfCopies = parseInt(responseMessage.body);
                            
                            if (!isNaN(numberOfCopies)) {
                                // Now prompt for color preference
                                responseMessage.reply('Do you want the copies in black and white or color? Please type "bw" for black and white or "color" for color.');
                                console.log(numberOfCopies);
                                // Listen for color preference
                                client.on('message', async colorMessage => {
                                    if (colorMessage.body && colorMessage.from === message.from) {
                                        const colorPreference = colorMessage.body.toLowerCase();
                                        console.log(colorPreference);
                                        if (colorPreference === 'bw' || colorPreference === 'color') {
                                            colorMessage.reply(`You requested ${numberOfCopies} ${colorPreference === 'bw' ? 'black and white' : 'color'} copies.`);
                                        } else {
                                            console.log('Invalid input.');
                                        }
                                    }
                                });
                            }
                        }
                    });
                
                    // Insert filename into MongoDB
                    insertFilenameToDB(media.filename);
            })
        
            .catch(error => {
                console.error('Error:', error);
            });
        }
    }
    } else if (message.body === 'ping') {
        message.reply('pong');
        console.log('ping message recevied');
    } else if (message.body === 'nadako') {
        message.reply('avo');
        message.react('🚶');
    } else if (message.body === '!anand') {
        message.reply('ni eatha naaayeeeee!');
        message.react('🖕');
    } else if(message.body==='!erajhipo'){
        message.reply('ninte achan');
        message.reply('LocalAuth loggingout.');
    } else if (message.body === '!epadida') {
        message.reply('unnal mudiyath thambi!');
        message.react('😙');
    } else if (message.body === '!everyone') {
        const chat = await message.getChat();
        const userNumber = '917034358874';
        /**
         * To mention one user you can pass user's ID to 'mentions' property as is,
         * without wrapping it in Array, and a user's phone number to the message body:
         */
        await chat.sendMessage(`Hi @${userNumber}`, {
            mentions: userNumber + '@c.us'
        });
        // To mention a list of users:
        await chat.sendMessage(`Hi @${userNumber}, @${userNumber}`, {
            mentions: [userNumber + '@c.us', userNumber + '@c.us']
        });
    } else if (message.body === '!list') {
        let sections = [
            { title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }
        ];
        let list = new List('List body', 'btnText', sections, 'Title', 'footer');
        client.sendMessage(message.from, list);
    }
    
});

// (async () => {
//     await connectToDB();
//     await client.initialize();
// })();
(async () => {
    // Initialize Puppeteer browser
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      args: [] // You can add additional arguments if needed
    });

    await connectToDB();
    await client.initialize();
})();
