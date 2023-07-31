const serverless = require("serverless-http");
const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { PutCommand, DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const app = express();

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const token = process.env.TOKEN;

app.use(express.json());

app.get("/webhooks", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === token
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(400);
  }
});

app.post("/webhooks", (req, res) => {
  const body = req.body;

  console.log("request body >>>", body);

  console.log(body.entry[0].changes[0].value.messages);

  if (body.entry[0].changes[0].field !== "messages") {
    res.sendStatus(400);
    return;
  }

  const reviews = body.entry[0].changes[0].value.messages.map(
    async (message) => {
      const command = new PutCommand({
        TableName: process.env.REVIEW_TABLE,
        Item: {
          phonenumber: message.from,
          review: message.text.body,
        },
      });

      return docClient.send(command);
    }
  );

  Promise.all(reviews)
    .then((data) => {
      console.log(data);
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(400);
    });
  return;
});

const sendMessage = (message, recipientNum) => {
  const whatsappBusinessNumber = process.env.WHATSAPP_BUSINESS_NUMBER;
  const URL = `https://graph.facebook.com/v17.0//messages`;
};

module.exports.handler = serverless(app);
