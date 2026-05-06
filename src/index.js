// src/index.js
import * as core from '@actions/core';
import * as github from '@actions/github';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QA_PROMPT, OP_PROMPT, DEFAULT_PROMPT } from './prompt.js';

async function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const openaiApiKey = core.getInput('openai-api-key');
    const geminiApiKey = core.getInput('gemini-api-key');
    const aiProviderInput = core.getInput('ai-provider').toLowerCase();
    const qaBranchPattern = core.getInput('qa-branch-pattern') || 'qa|test';
    const opBranchPattern = core.getInput('op-branch-pattern') || 'main|master|op|prod';
    const openaiModel = core.getInput('openai-model') || 'gpt-4o';
    const geminiModelName = core.getInput('gemini-model') || 'gemini-1.5-flash';
    
    // Provider selection logic
    let selectedProvider = '';
    if (aiProviderInput === 'openai') {
      if (!openaiApiKey) throw new Error('OpenAI provider selected but openai-api-key is missing.');
      selectedProvider = 'openai';
    } else if (aiProviderInput === 'gemini') {
      if (!geminiApiKey) throw new Error('Gemini provider selected but gemini-api-key is missing.');
      selectedProvider = 'gemini';
    } else {
      // 'auto' or other: fallback based on available keys
      if (openaiApiKey) selectedProvider = 'openai';
      else if (geminiApiKey) selectedProvider = 'gemini';
      else throw new Error('No API keys provided for either OpenAI or Gemini.');
    }

    core.info(`Selected AI Provider: ${selectedProvider}`);

    const context = github.context;
    if (context.eventName !== 'pull_request') {
      core.info('This action only runs on pull_request events.');
      return;
    }
    
    const pr = context.payload.pull_request;
    const baseBranch = pr.base.ref;
    const prNumber = pr.number;
    const repo = context.repo;
    
    // Select Prompt based on branch pattern
    let systemPrompt = DEFAULT_PROMPT;
    const qaRegex = new RegExp(qaBranchPattern, 'i');
    const opRegex = new RegExp(opBranchPattern, 'i');

    if (qaRegex.test(baseBranch)) {
      systemPrompt = QA_PROMPT;
      core.info(`Branch [${baseBranch}] matches QA pattern. Using QA Prompt.`);
    } else if (opRegex.test(baseBranch)) {
      systemPrompt = OP_PROMPT;
      core.info(`Branch [${baseBranch}] matches OP pattern. Using OP Prompt.`);
    } else {
      core.info(`Branch [${baseBranch}] matches no specific pattern. Using Default Prompt.`);
    }

    const octokit = github.getOctokit(githubToken);
    
    core.info(`Fetching diff for PR #${prNumber}...`);
    const { data: diff } = await octokit.rest.pulls.get({
      ...repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' }
    });
    
    core.info(`Fetching commits for PR #${prNumber}...`);
    const { data: commits } = await octokit.rest.pulls.listCommits({
      ...repo,
      pull_number: prNumber
    });
    const commitMessages = commits.map(c => c.commit.message).join('\n');
    const prBody = pr.body || 'No description provided.';
    
    const userPrompt = `
PR Title: ${pr.title}
PR Description: ${prBody}

Commit Messages:
${commitMessages}

Git Diff:
${diff}
`;

    let reply = '';

    if (selectedProvider === 'gemini') {
      core.info(`Calling Gemini AI (${geminiModelName})...`);
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ 
        model: geminiModelName,
        systemInstruction: systemPrompt 
      });
      const result = await model.generateContent(userPrompt);
      reply = result.response.text();
    } else {
      core.info(`Calling OpenAI (${openaiModel})...`);
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: openaiModel,
        temperature: 0.3,
      });
      reply = completion.choices[0].message.content;
    }
    
    core.info('Posting summary as a comment...');
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
