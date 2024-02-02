const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');

const app = express();
const port = process.env.PORT || 3000;

// Load environment variables from a .env file
dotenv.config();

app.use(bodyParser.json());

app.post('/update-issue-jira', async (req, res) => {
  const gitPayload = req.body;
  const action = gitPayload.action || '';
  const merged = gitPayload.pull_request.merged || false;
  const prBody = gitPayload.pull_request.body;

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
          const responseJira = await axios.put(urlJira, { fields: { customfield_10074: { value: 'automated' } } }, {
            auth: {
              username: process.env.USERNAME_JIRA,
              password: process.env.PASSWORD_JIRA,
            },
          });

          const status = responseJira.status;

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

    const result = {
      result: {
        success: success,
        failed: failed,
      },
    };

    res.status(200).json(result);
  } else {
    res.status(400).json({ message: 'Invalid payload or action' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
