const axios = require('axios');

const convertUtcToDate = (utcDate) => {
  const date = new Date(utcDate);

  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

  const formattedDate = localDate.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZoneName: 'short',
  });

  return formattedDate.replaceAll('/', '-');
};

const sendNotification = async (prData, resultData) => {
  const columnsNo = [
    {
      type: 'TextBlock',
      text: 'No',
      wrap: true,
      horizontalAlignment: 'Center',
    },
  ];

  const columnsId = [
    {
      type: 'TextBlock',
      text: 'Issue ID',
      wrap: true,
      horizontalAlignment: 'Center',
    },
  ];

  const columnsResult = [
    {
      type: 'TextBlock',
      text: 'Result',
      wrap: true,
      horizontalAlignment: 'Center',
    },
  ];

  const { success } = resultData;
  const { failed } = resultData;

  let no = 1;

  success.forEach((issueId) => {
    columnsNo.push({
      type: 'TextBlock',
      text: no,
      wrap: true,
      horizontalAlignment: 'Center',
    });

    columnsId.push({
      type: 'TextBlock',
      text: issueId,
      wrap: true,
      horizontalAlignment: 'Center',
    });

    columnsResult.push({
      type: 'TextBlock',
      text: 'Success',
      wrap: true,
      color: 'Good',
      horizontalAlignment: 'Center',
    });

    no += 1;
  });

  failed.forEach((issueId) => {
    columnsNo.push({
      type: 'TextBlock',
      text: no,
      wrap: true,
      horizontalAlignment: 'Center',
    });

    columnsId.push({
      type: 'TextBlock',
      text: issueId,
      wrap: true,
      horizontalAlignment: 'Center',
    });

    columnsResult.push({
      type: 'TextBlock',
      text: 'Failed',
      wrap: true,
      color: 'Attention',
      horizontalAlignment: 'Center',
    });

    no += 1;
  });

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: 'Result Update Coverage JIRA',
              horizontalAlignment: 'Center',
              color: 'Accent',
            },
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      weight: 'Bolder',
                      text: `PR Number : #${prData.prNumber}`,
                      wrap: true,
                      horizontalAlignment: 'Center',
                    },
                    {
                      type: 'TextBlock',
                      weight: 'Bolder',
                      spacing: 'None',
                      text: `PR By : ${prData.prMergedBy}`,
                      wrap: true,
                      horizontalAlignment: 'Center',
                    },
                    {
                      type: 'TextBlock',
                      spacing: 'None',
                      text: `Merged at : ${convertUtcToDate(prData.prMergedAt)}`,
                      isSubtle: true,
                      wrap: true,
                      horizontalAlignment: 'Center',
                    },
                  ],
                  width: 'stretch',
                },
              ],
            },
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: columnsNo,
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: columnsId,
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: columnsResult,
                },
              ],
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Pull Request Detail',
              url: prData.prUrl,
              style: 'positive',
              horizontalAlignment: 'Center',
            },
          ],
        },
      },
    ],
  };

  const headers = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const sendTeamsNotif = await axios.post(process.env.TEAMS_NOTIFICATION_URL, payload, headers);

  return sendTeamsNotif;
};

module.exports = {
  convertUtcToDate,
  sendNotification,
};
