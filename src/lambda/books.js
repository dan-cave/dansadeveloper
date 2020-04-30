const { google } = require("googleapis");

const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

const clientEmail = process.env.client_email;
const privateKey = process.env.private_key.replace(/\\n/g, "\n");
const folderId = process.env.folder_id;
const downloadString = process.env.download_string;

const auth = new google.auth.JWT(clientEmail, null, privateKey, scopes);
const drive = google.drive({ version: "v2", auth: auth });

function getBooks() {
  let retrievePageOfChildren = function (request, result) {
    return new Promise((resolve, reject) => {
      request
        .then((resp) => {
          result = result.concat(resp.data.items);
          let nextPageToken = resp.data.nextPageToken;
          if (nextPageToken) {
            request = drive.children.list(
              {
                folderId: folderId,
                pageToken: nextPageToken,
              },
              auth
            );

            retrievePageOfChildren(request, result);
          } else {
            xmlifyResponse(result)
              .then((xml) => resolve(xml))
              .catch((err) => reject(err));
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
  return new Promise((resolve, reject) => {
    var initialRequest = drive.files.list();
    retrievePageOfChildren(initialRequest, [])
      .then((xml) => resolve(xml))
      .catch((err) => reject(err));
  });
}

function xmlifyResponse(response) {
  return new Promise((resolve, reject) => {
    string =
      "<rss><channel><title>Audiobooks</title><link>https://dansadeveloper.com/.netlify/functions/books</link><image><url>https://images-na.ssl-images-amazon.com/images/I/41CVxg--02L._SX331_BO1,204,203,200_.jpg</url><title>Audiobooks</title><link>https://dansadeveloper.com/.netlify/functions/books</link></image><items>";
    const files = response.map((item) => {
      return drive.files.get({ fileId: item.id, auth: auth });
    });
    Promise.all(files)
      .then((resFiles) => {
        resFiles.forEach((res) => {
          string += "<item>";
          string += `<title>${encodeXml(res.data.title)}</title>`;
          string += `<enclosure url="${encodeXml(
            `https://www.googleapis.com/drive/v3/files/${res.data.id}/?key=${downloadString}&alt=media`
          )}" type="audio/mpeg"></enclosure>`;
          string += `<pubDate>${res.data.createdDate}</pubDate>`;
          string += "</item>";
        });
        string += "</items></channel></rss>";
        resolve(string);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function encodeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\t/g, "&#x9;")
    .replace(/\n/g, "&#xA;")
    .replace(/\r/g, "&#xD;");
}

exports.handler = function (event, context, callback) {
  getBooks()
    .then((books) => {
      callback(null, {
        statusCode: 200,
        headers: {
          "content-type": "text/xml",
        },
        body: books,
      });
    })
    .catch((err) => {
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error: err.toString() }),
      });
    });
};
