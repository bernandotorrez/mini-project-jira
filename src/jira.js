/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');
const { sendNotification } = require('./helpers/utils');

const app = express();
const port = process.env.PORT || 3000;

// NOTE: Load environment variables from a .env file
dotenv.config();

app.use(bodyParser.json());

app.post('/update-issue-jira', async (req, res) => {
  const gitPayload = req.body;
  const action = gitPayload.action || '';
  const merged = gitPayload.pull_request.merged || false;
  const prBody = gitPayload.pull_request.body || '';
  const prNumber = gitPayload.pull_request.number || 0;
  const prMergedAt = gitPayload.pull_request.merged_at || '00-00-0000';
  const prMergedBy = gitPayload.pull_request.assignee.login || '';
  const prUrl = gitPayload.pull_request.html_url || '';

  if (action === 'closed' && merged) {
    const matches = prBody.match(/\b([A-Z]+-\d{3})\b/g);
    const matchedStrings = Array.from(new Set(matches || []));

    const arrayOfId = [];
    const success = [];
    const failed = [];

    if (matchedStrings.length > 0) {
      arrayOfId.push(matchedStrings);
    }

    if (arrayOfId[0].length > 0) {
      for (const row of arrayOfId[0]) {
        try {
          const urlJira = `${process.env.URL_API_JIRA_V2}/issue/${row}`;
          const dataUpdate = { fields: { customfield_10074: { value: 'automated' } } };
          const responseJira = await axios.put(urlJira, dataUpdate, {
            auth: {
              username: process.env.USERNAME_JIRA,
              password: process.env.PASSWORD_JIRA,
            },
          });

          const { status } = responseJira;

          if (status === 204) {
            success.push(row);
          } else {
            failed.push(row);
          }
        } catch (error) {
          failed.push(row);
        }
      }
    }

    const resultData = {
      success,
      failed,
    };

    const prData = {
      prNumber,
      prMergedAt,
      prMergedBy,
      prUrl,
    };

    sendNotification(prData, resultData);

    const result = {
      result: resultData,
    };

    res.status(200).json(result);
  } else {
    res.status(200).json({ message: 'Nothing to do because PR is not closed and not merged' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
