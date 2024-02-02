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
  const prBody = gitPayload.pull_request.body || '';
  const prNumber = gitPayload.number || 0;
  const prMergedAt = gitPayload.pull_request.merged_at || '00-00-0000';
  const prMergedBy = gitPayload.pull_request.assignee.login || '';

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

    const resultData = {
        success,
        failed
    }

    const prData = {
        prNumber,
        prMergedAt,
        prMergedBy
    }

    sendNotification(prData, resultData)

    const result = {
      result: resultData
    };

    res.status(200).json(result);
  } else {
    res.status(400).json({ message: 'Invalid payload or action' });
  }
});

sendNotification = async (prData, resultData) => {
    const columnsNo = [
        {
            "type": "TextBlock",
            "text": "No",
            "wrap": true,
            "horizontalAlignment": "Center"
        },
    ]
    
    const columnsId = [
        {
            "type": "TextBlock",
            "text": "Issue ID",
            "wrap": true,
            "horizontalAlignment": "Center"
        },
    ];

    const columnsResult = [
        {
            "type": "TextBlock",
            "text": "Result",
            "wrap": true,
            "horizontalAlignment": "Center"
        },
    ];

    const success = resultData['success'];
    const failed = resultData['failed'];

    let no = 1;

    success.forEach((issueId) => {
        columnsNo.push({
            "type": "TextBlock",
            "text": no,
            "wrap": true,
            "horizontalAlignment": "Center"
        })

        columnsId.push({
            "type": "TextBlock",
            "text": issueId,
            "wrap": true,
            "horizontalAlignment": "Center"
        })

        columnsResult.push({
            "type": "TextBlock",
            "text": "Success",
            "wrap": true,
            "color": "Good",
            "horizontalAlignment": "Center"
        })

        no++;
    })

    failed.forEach((issueId) => {
        columnsNo.push({
            "type": "TextBlock",
            "text": no,
            "wrap": true,
            "horizontalAlignment": "Center"
        })

        columnsId.push({
            "type": "TextBlock",
            "text": issueId,
            "wrap": true,
            "horizontalAlignment": "Center"
        })

        columnsResult.push({
            "type": "TextBlock",
            "text": "Failed",
            "wrap": true,
            "color": "Attention",
            "horizontalAlignment": "Center"
        })
        
        no++;
    })

    const payload = {
        "type":"message",
        "attachments":[
           {
              "contentType":"application/vnd.microsoft.card.adaptive",
              "contentUrl":null,
              "content":{
                "$schema":"http://adaptivecards.io/schemas/adaptive-card.json",
                "type":"AdaptiveCard",
                "version":"1.2",
                "body": [
                    {
                        "type": "TextBlock",
                        "size": "Medium",
                        "weight": "Bolder",
                        "text": "Result Update Coverage JIRA",
                        "horizontalAlignment": "Center",
                        "color": "Accent"
                    },
                    {
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "weight": "Bolder",
                                        "text": `PR Number : #${prData.prNumber}`,
                                        "wrap": true,
                                        "horizontalAlignment": "Center"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "weight": "Bolder",
                                        "spacing": "None",
                                        "text": `PR By : ${prData.prMergedBy}`,
                                        "wrap": true,
                                        "horizontalAlignment": "Center"
                                    },
                                    {
                                        "type": "TextBlock",
                                        "spacing": "None",
                                        "text": `Merged at : ${convertUtcToDate(prData.prMergedAt)}`,
                                        "isSubtle": true,
                                        "wrap": true,
                                        "horizontalAlignment": "Center"
                                    }
                                ],
                                "width": "stretch"
                            }
                        ]
                    },
                    {
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "width": "stretch",
                                "items": columnsNo
                            },
                            {
                                "type": "Column",
                                "width": "stretch",
                                "items": columnsId
                            },
                            {
                                "type": "Column",
                                "width": "stretch",
                                "items": columnsResult
                            }
                        ]
                    }
                ],
                "actions": [
                    {
                        "type": "Action.OpenUrl",
                        "title": "View",
                        "url": "https://github.com/pt-kompas-media-nusantara/kompas-api-automation/pulls",
                        "style": "positive",
                        "horizontalAlignment": "Center"
                    }
                ],
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.6"
              }
           }
        ]
     }
    
    const headers = {
        'headers': {
            'Content-Type': 'application/json'
        }
    }

    const sendNotification = await axios.post(process.env.TEAMS_NOTIFICATION_URL, payload, headers)

    return sendNotification;
}

convertUtcToDate = (utcDate) => {
    // Parse the UTC date string
    const date = new Date(utcDate);
  
    // Convert to local time
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  
    // Format the date in the 'd-m-Y H:i:s' format
    const formattedDate = localDate.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZoneName: 'short'
    });
  
    return formattedDate.replaceAll('/', '-');
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
