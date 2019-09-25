const { google } = require('googleapis');

const scopes = [
  'https://www.googleapis.com/auth/drive.readonly'
];

const clientEmail = process.env.client_email;
const privateKey = process.env.private_key;
const folderId = process.env.folder_id;
const downloadString = process.env.download_string;

const secrets = {
  clientEmail: clientEmail,
  privateKey: privateKey,
  folderId: folderId,
  downloadString: downloadString
}

const auth = new google.auth.JWT(clientEmail, null, privateKey, scopes);
const drive = google.drive({ version: 'v2', auth: auth });


function getBooks() {
    let retrievePageOfChildren = function (request, result) {
      return new Promise((resolve, reject) => {
      request.then((resp) => {
        result = result.concat(resp.data.items);
        let nextPageToken = resp.data.nextPageToken;
        if (nextPageToken) {
          request = drive.children.list({
            'folderId': folderId,
            'pageToken': nextPageToken
          }, auth);
  
          retrievePageOfChildren(request, result);
        }
        else {
          xmlifyResponse(result).then((xml) => resolve(xml)).catch((err) => reject(err));
        }
      }).catch((err) => {
         reject(err);
      });
    });
  }
  return new Promise((resolve, reject) => {
    var initialRequest = drive.children.list({
      'folderId': folderId
    }, auth);
    retrievePageOfChildren(initialRequest, []).then((xml) => resolve(xml)).catch((err) => reject(err));
  });
}

function xmlifyResponse(response) {
  return new Promise((resolve, reject) => {
    string = "<rss><channel><title>Audiobooks</title><link>dansadeveloper.com/.netlify/functions/books</link>";
    response.forEach((item, idx) => {
      drive.files.get({ fileId: item.id, auth: auth }).then((res) => {
        string += "<item>";
        string += `<title>${res.data.title}</title>`;
        string += `<enclosure url="https://www.googleapis.com/drive/v3/files/${res.data.id}/?key=${downloadString}&alt=media" type="audio/mpeg"></enclosure>`;
        string += "</item>";
        if (idx == response.length - 1) {
          string += "</channel></rss>";
          resolve(string);
        }
      }).catch((err) => {
          reject(err);
      });
    });
  })
}

exports.handler = function (event, context, callback) {
  getBooks().then((books) => {
    callback(null, {
      statusCode: 200,
      body: secrets
    });
  }).catch((err) => {
    callback(null, {
      statusCode: 500,
      body: secrets
    });
  });
};