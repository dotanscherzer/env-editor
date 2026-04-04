const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

function getOverrides() {
  try {
    return JSON.parse(process.env.ENV_PATHS_OVERRIDE || '{}');
  } catch {
    return {};
  }
}

// Detect host-side .env path for a container:
// 1. Check ENV_PATHS_OVERRIDE by container name (takes priority)
// 2. Use docker compose working_dir label + check for .env there
function detectEnvPath(containerName, labels) {
  const overrides = getOverrides();
  if (overrides[containerName]) return overrides[containerName];

  const workingDir = labels['com.docker.compose.project.working_dir'];
  if (workingDir) {
    const candidate = path.join(workingDir, '.env');
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function parseEnvFile(raw) {
  const vars = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    vars.push({ key: trimmed.substring(0, eqIndex), value: trimmed.substring(eqIndex + 1) });
  }
  return { vars, raw };
}

async function listContainers() {
  const containers = await docker.listContainers();
  return containers.map((info) => {
    const name = info.Names[0].replace(/^\//, '');
    const labels = info.Labels || {};
    const envPath = detectEnvPath(name, labels);
    let varCount = 0;
    if (envPath) {
      try {
        const { vars } = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
        varCount = vars.length;
      } catch {
        // unreadable
      }
    }
    return { id: info.Id, name, status: info.State, envPath, varCount };
  });
}

async function readEnv(containerId, envPath) {
  const raw = fs.readFileSync(envPath, 'utf8');
  return parseEnvFile(raw);
}

async function writeEnv(containerId, envPath, vars) {
  fs.copyFileSync(envPath, envPath + '.bak');
  const content = vars.map((v) => `${v.key}=${v.value}`).join('\n') + '\n';
  fs.writeFileSync(envPath, content, 'utf8');
  return { success: true, backed_up: envPath + '.bak' };
}

async function restartContainer(containerId) {
  await docker.getContainer(containerId).restart();
  return { success: true };
}

module.exports = { listContainers, readEnv, writeEnv, restartContainer };
