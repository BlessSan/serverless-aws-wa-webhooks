const serverless = require("serverless-http");
const express = require("express");
require("dotenv").config();
const axios = require("axios");
// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const { PutCommand, DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const app = express();

// const client = new DynamoDBClient({});
// const docClient = DynamoDBDocumentClient.from(client);

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

app.post("/webhooks", async (req, res) => {
  const body = req.body;

  if (Object.hasOwn(body, "entry")) {
    for (let entry of body.entry) {
      console.log("entry >>>", entry);
      for (let change of entry.changes) {
        console.log("change >>>", change);
        if (change.field !== "messages") {
          res.sendStatus(400);
          return;
        } else {
          if (Object.hasOwn(change.value, "messages")) {
            const ownNumberId = change.value.metadata.phone_number_id;
            console.log("contacts", change.value.contacts);
            const recipientId = change.value.contacts[0].wa_id;
            for (let message of change.value.messages) {
              console.log("message >>>", message);
              try {
                const response = await sendMessage(
                  message.text.body,
                  recipientId,
                  ownNumberId
                );
                console.log("response >>>", response);
                res.sendStatus(200);
                return;
              } catch (e) {
                console.log("error during post >>>", e);
                res.sendStatus(400);
                return;
              }
            }
          } else {
            console.log(
              "no messages in change.value, statuses >>>",
              change.value.statuses
            );
            res.sendStatus(200);
            return;
          }
        }
      }
    }
  } else {
    console.log("request body >>>", body);
    res.sendStatus(200);
    return;
  }
  //* temp comment so that not using dynamoDB resource
  // const reviews = valueObj.messages.map(async (message) => {
  //   const command = new PutCommand({
  //     TableName: process.env.REVIEW_TABLE,
  //     Item: {
  //       phonenumber: message.from,
  //       review: message.text.body,
  //     },
  //   });

  //   return docClient.send(command);
  // });

  // Promise.all(reviews)
  //   .then((data) => {
  //     console.log(data);
  //     res.sendStatus(200);
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //     res.sendStatus(400);
  //   });
  // return;
});

const sendMessage = (message, recipientNum, id) => {
  const URL = `https://graph.facebook.com/v17.0/${id}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNum,
    type: "text",
    text: {
      // the text object
      body: message,
    },
  };

  const headers = {
    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };

  console.log("reply message body >>>", body);

  return axios.post(URL, body, { headers });
};

module.exports.handler = serverless(app);
