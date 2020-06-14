const xml2js = require("xml2js");
const fetch = require("node-fetch");

const feeds = [
  `https://www.reddit.com/r/BlackWolfFeed/.rss`,
  `http://feeds.soundcloud.com/users/soundcloud:users:211911700/sounds.rss`,
];

let fullJs = {
  rss: {
    $: {
      "xmlns:atom": "http://www.w3.org/2005/Atom",
      "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
      version: "2.0",
    },
    channel: [
      {
        title: ["Chapo Trap House"],
        image: [
          {
            link: ["https://dansadeveloper.com/.netlify/functions/chapo"],
            title: ["Chapo Trap House"],
            url: ["https://pbs.twimg.com/media/B_x6X0uW8AAc2fG.png"],
          },
        ],
        description: ["Posting is praxis"],
        link: ["https://dansadeveloper.com/.netlify/functions/chapo"],
        pubDate: [],
        lastBuildDate: [],
        item: [],
      },
    ],
  },
};

function combineFeeds() {
  return new Promise((resolve, reject) => {
    const feedPromises = feeds.map((feed) => {
      return fetch.default(feed);
    });

    Promise.all(feedPromises).then(async (promises) => {
      const blackWolfText = await promises[0].text();
      const chapoText = await promises[1].text();
      const parser = new xml2js.Parser();
      let blackWolfJs = await parser.parseStringPromise(blackWolfText);
      let chapoJs = await parser.parseStringPromise(chapoText);

      chapoJs.rss.channel[0].item.forEach((it) => {
        if (
          !it.title[0].includes("UNLOCKED") &&
          !it.title[0].includes("Teaser")
        ) {
          fullJs.rss.channel[0].item.push(it);
        }
      });

      blackWolfJs.rss.channel[0].item.forEach((it) => {
        if (!it.title[0].includes("/r/BlackWolfFeed")) {
          fullJs.rss.channel[0].item.push(it);
        }
      });

      fullJs.rss.channel[0].item.sort((a, b) => {
        return new Date(b.pubDate[0]) - new Date(a.pubDate[0]);
      });

      const builder = new xml2js.Builder({
        xmldec: { version: "1.0", encoding: "UTF-8" },
        cdata: true,
      });

      const xml = builder.buildObject(fullJs);

      resolve(xml);
    });
  });
}

exports.handler = function (event, context, callback) {
  combineFeeds()
    .then((feed) => {
      callback(null, {
        statusCode: 200,
        headers: {
          "content-type": "text/xml",
        },
        body: feed,
      });
    })
    .catch((err) => {
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error: err.toString() }),
      });
    });
};
