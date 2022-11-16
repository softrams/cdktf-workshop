const express = require("express");
const port = process.env.PORT || 3000;
const app = express();
const serverlessExpress = require("@vendia/serverless-express");
let serverlessExpressInstance;
app.get("/welcome", (req, res) =>
  res.json({
    message: "Welcome to the Lambda",
  })
);

exports.handler = async (event, context) => {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
};
