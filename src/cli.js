#!/usr/bin/env node
/**
 * CLI for site-monitor: `run` checks all watchers once, `watch` repeats on
 * an interval, `list` shows configured watchers and their last-checked state.
 */

import { Command } from 'commander';
import cron from 'node-cron';
import { loadConfig, ConfigError } from './config.js';
import { checkAllWatchers } from './monitor.js';
import { notifyConsole, notifyWebhook } from './notifier.js';
import { loadState } from './store.js';

const program = new Command();

program
  .name('site-monitor')
  .description('Monitor web pages for content changes via CSS selectors')
  .version('1.0.0');

async function runChecks(configPath) {
  const { watchers, stateDir } = await loadConfig(configPath);
  const results = await checkAllWatchers(watchers, stateDir);

  let changedCount = 0;
  let errorCount = 0;

  for (const result of results) {
    const watcher = watchers.find((w) => w.name === result.watcherName);

    if (result.status === 'changed') {
      changedCount++;
      notifyConsole(watcher, result.diff);
      if (watcher.webhookUrl) {
        await notifyWebhook(watcher.webhookUrl, watcher, result.diff);
      }
    } else if (result.status === 'first_check') {
      console.log(`[${new Date().toISOString()}] Baseline recorded for "${result.watcherName}" (first check)`);
    } else if (result.status === 'unchanged') {
      console.log(`[${new Date().toISOString()}] No change: "${result.watcherName}"`);
    } else if (result.status === 'error') {
      errorCount++;
      console.error(`[${new Date().toISOString()}] ERROR checking "${result.watcherName}": ${result.error.message}`);
    }
  }

  console.log('');
  console.log(
    `Summary: ${results.length} watcher(s) checked, ${changedCount} changed, ${errorCount} error(s)`,
  );

  return { changedCount, errorCount };
}

program
  .command('run')
  .description('Check all configured watchers once and exit')
  .option('-c, --config <path>', 'path to watchers config file', 'config/watchers.json')
  .action(async (options) => {
    try {
      const { errorCount } = await runChecks(options.config);
      process.exitCode = errorCount > 0 ? 1 : 0;
    } catch (err) {
      if (err instanceof ConfigError) {
        console.error(`Config error: ${err.message}`);
      } else {
        console.error(`Unexpected error: ${err.message}`);
      }
      process.exitCode = 1;
    }
  });

program
  .command('watch')
  .description('Repeatedly check all configured watchers on a cron schedule')
  .option('-c, --config <path>', 'path to watchers config file', 'config/watchers.json')
  .option('-s, --schedule <cron>', 'cron expression for check frequency', '*/15 * * * *')
  .action(async (options) => {
    if (!cron.validate(options.schedule)) {
      console.error(`Invalid cron expression: "${options.schedule}"`);
      process.exitCode = 1;
      return;
    }

    console.log(`Starting site-monitor with schedule "${options.schedule}" (config: ${options.config})`);
    console.log('Running an initial check now, then following the schedule. Press Ctrl+C to stop.');

    await runChecks(options.config).catch((err) => console.error(`Unexpected error: ${err.message}`));

    cron.schedule(options.schedule, async () => {
      console.log(`\n[${new Date().toISOString()}] Running scheduled check...`);
      await runChecks(options.config).catch((err) => console.error(`Unexpected error: ${err.message}`));
    });
  });

program
  .command('list')
  .description('List configured watchers and their last-checked status')
  .option('-c, --config <path>', 'path to watchers config file', 'config/watchers.json')
  .action(async (options) => {
    try {
      const { watchers, stateDir } = await loadConfig(options.config);
      for (const watcher of watchers) {
        const state = await loadState(stateDir, watcher.name);
        const lastChecked = state?.lastChecked ?? 'never';
        console.log(`${watcher.name}`);
        console.log(`  URL:          ${watcher.url}`);
        console.log(`  Selector:     ${watcher.selector}`);
        console.log(`  Last checked: ${lastChecked}`);
        console.log('');
      }
    } catch (err) {
      console.error(err instanceof ConfigError ? `Config error: ${err.message}` : err.message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
