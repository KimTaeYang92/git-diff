// src/index.js
import * as core from '@actions/core';
import * as github from '@actions/github';
import { OpenAI } from 'openai';
import { systemPrompt } from './prompt.js';

async function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const openaiApiKey = core.getInput('openai-api-key', { required: true });
    
    const context = github.context;
    
    if (context.eventName !== 'pull_request') {
      core.info('This action only runs on pull_request events.');
      return;
    }
    
    const prNumber = context.payload.pull_request.number;
    const repo = context.repo;
    
    const octokit = github.getOctokit(githubToken);
    
    core.info(`Fetching diff for PR #${prNumber}...`);
    
    // Fetch PR diff
    const { data: diff } = await octokit.rest.pulls.get({
      ...repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });
    
    core.info(`Fetching commits for PR #${prNumber}...`);
    
    // Fetch commits
    const { data: commits } = await octokit.rest.pulls.listCommits({
      ...repo,
      pull_number: prNumber
    });
    
    const commitMessages = commits.map(c => c.commit.message).join('\n');
    
    const userPrompt = `
Commit Messages:
${commitMessages}

Git Diff:
${diff}
`;

    core.info('Sending data to OpenAI...');
    
    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-4o',
      temperature: 0.3,
    });
    
    const reply = completion.choices[0].message.content;
    
    core.info('Posting summary as a comment...');
    
    // Create PR Comment
    await octokit.rest.issues.createComment({
      ...repo,
      issue_number: prNumber,
      body: reply
    });
    
    core.info('Successfully created PR comment.');

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
