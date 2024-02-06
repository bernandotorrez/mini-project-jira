/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const endpoints = require('./endpoints/jira.endpoint');
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

  const nullResult = {
    result: {
      success: [],
      failed: [],
    },
  };

  if (action === 'closed' && merged) {
    const matches = prBody.match(/\b([A-Z]+-\d{3})\b/g);
    const matchedStrings = Array.from(new Set(matches || []));

    const arrayOfId = [];
    const success = [];
    const failed = [];

    if (matchedStrings.length > 0) arrayOfId.push(matchedStrings);

    if (matches) {
      if (arrayOfId[0].length > 0) {
        for (const row of arrayOfId[0]) {
          try {
            const responseJira = await endpoints.updateIssue({
              issueId: row,
            });

            if (responseJira.status === 204) {
              // NOTE: Add Comment to Issue
              const responseCommentJira = await endpoints.addComment({
                issueId: row,
                prNumber,
              });

              if (responseCommentJira.status === 201) {
                success.push(row);
              }
            } else {
              failed.push(row);
            }
          } catch (error) {
            failed.push(row);
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
        res.status(200).json(nullResult);
      }
    } else {
      res.status(200).json(nullResult);
    }
  } else {
    res.status(200).json(nullResult);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
