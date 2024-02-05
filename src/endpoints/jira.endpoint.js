const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const username = process.env.USERNAME_JIRA;
const password = process.env.PASSWORD_JIRA;

const credentials = btoa(`${username}:${password}`);

const urlApi = process.env.URL_API_JIRA_V2;

const axiosInstance = axios.create({
  baseURL: urlApi,
  headers: {
    common: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  },
});

const updateIssue = async ({ issueId, data }) => {
  const url = `/issue/${issueId}`;
  const response = await axiosInstance.put(url, data);

  return response;
};

const addComment = async ({ issueId, data }) => {
  const url = `/issue/${issueId}/comment`;
  const response = await axiosInstance.post(url, data);

  return response;
};

module.exports = {
  updateIssue,
  addComment,
};
