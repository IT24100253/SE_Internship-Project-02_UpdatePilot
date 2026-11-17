import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);


let config: any = {};
const configPath = path.join(__dirname, 'agent-config.json');
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const detectedToken =
  process.env.AGENT_TOKEN ||
  config.agentToken ||
  config.token ||
  config.rawToken ||
  config.deviceToken ||
  Object.values(config).find((v) => typeof v === 'string' && v.length >= 32 && !v.startsWith('http'));

const API_URL = process.env.API_URL || config.apiUrl || config.API_URL || 'http://localhost:5000/api/v1';

if (!detectedToken) {
  console.error('❌ Valid AGENT_TOKEN not found in agent-config.json:', config);
  process.exit(1);
}

const headers = {
  'x-agent-token': String(detectedToken),
  Authorization: `Bearer ${detectedToken}`,
  'Content-Type': 'application/json',
};

let isBusy = false;

async function scanApplications() {
  console.log('🔍 Scanning installed applications on your computer (This may take 10-20 seconds)...');
  try {
    const { stdout: listOut } = await execAsync('winget list --accept-source-agreements', {
      maxBuffer: 1024 * 1024 * 10,
    });

    const lines = listOut
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const apps: any[] = [];

    for (const line of lines) {
      if (line.startsWith('-') || line.startsWith('Name') || line.includes('upgrades available')) {
        continue;
      }

      const parts = line.split(/\s{2,}/);
      if (parts.length >= 3) {
        const name = parts[0];
        const packageId = parts[1];
        const installedVersion = parts[2];
        const availableVersion = parts.length >= 4 && parts[3] !== 'winget' ? parts[3] : null;

        apps.push({
          name,
          packageId: packageId.includes('.') ? packageId : null,
          installedVersion,
          availableVersion,
          source: 'winget',
        });
      }
    }

    return apps;
  } catch (err) {
    console.error('❌ Winget scan error:', err);
    return [];
  }
}

async function executeUpdate(job: any) {
  const app = job.application;
  const targetId = app.packageId || app.displayName;
  console.log(`🚀 Starting update for ${app.displayName} (${targetId})...`);

  try {
    const cmd = app.packageId
      ? `winget upgrade --id "${app.packageId}" --exact --silent --accept-package-agreements --accept-source-agreements`
      : `winget upgrade --name "${app.displayName}" --exact --silent --accept-package-agreements --accept-source-agreements`;

    await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 });
    console.log(`✅ Update completed successfully for ${app.displayName}!`);

    await axios.post(
      `${API_URL}/agent/updates/${job.id}/report`,
      {
        state: 'COMPLETED',
        exitCode: 0,
        verifiedVersion: job.targetVersion,
      },
      { headers }
    );
  } catch (err: any) {
    console.error(`❌ Update failed for ${app.displayName}:`, err.message);
    await axios.post(
      `${API_URL}/agent/updates/${job.id}/report`,
      {
        state: 'FAILED',
        exitCode: err.code || 1,
        errorSummary: (err.stderr || err.message || 'Winget upgrade failed').slice(0, 200),
      },
      { headers }
    );
  }
}

async function pollJobs() {
  if (isBusy) return;
  isBusy = true;

  try {
    const res = await axios.get(`${API_URL}/agent/jobs`, { headers });
    const { pendingScan, pendingUpdate } = res.data;

    
    if (pendingUpdate) {
      console.log(`📦 New Update Job received: ${pendingUpdate.id}`);
      await executeUpdate(pendingUpdate);
    }
    
    else if (pendingScan) {
      console.log(`📋 New Scan Job received: ${pendingScan.id}`);
      const apps = await scanApplications();
      await axios.post(
        `${API_URL}/agent/scans/${pendingScan.id}/report`,
        {
          osVersion: `${os.type()} ${os.release()}`,
          agentVersion: '1.0.0',
          apps,
        },
        { headers }
      );
      console.log(`✅ Scan report submitted (${apps.length} apps).`);
    }
  } catch (err: any) {
    console.error('⚠️ Polling/Report error:', err.response?.data || err.message);
  } finally {
    isBusy = false;
  }
}

console.log('🤖 UpdatePilot Agent started! Polling for jobs every 5 seconds...');
setInterval(pollJobs, 5000);
pollJobs();