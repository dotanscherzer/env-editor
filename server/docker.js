const Docker = require('dockerode');
const tar = require('tar-stream');
const path = require('path');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Default paths to try when detecting .env location
const DEFAULT_ENV_PATHS = [
  '/app/.env',
  '/data/.env',
  '/home/node/app/.env',
  '/root/.env',
];

function getOverrides() {
  try {
    return JSON.parse(process.env.ENV_PATHS_OVERRIDE || '{}');
  } catch {
    return {};
  }
}

async function execInContainer(container, cmd) {
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ Detach: false, Tty: false });

  return new Promise((resolve, reject) => {
    const chunks = { stdout: [], stderr: [] };
    docker.modem.demuxStream(stream, {
      write: (chunk) => chunks.stdout.push(chunk),
    }, {
      write: (chunk) => chunks.stderr.push(chunk),
    });
    stream.on('end', () => {
      resolve({
        stdout: Buffer.concat(chunks.stdout).toString(),
        stderr: Buffer.concat(chunks.stderr).toString(),
      });
    });
    stream.on('error', reject);
  });
}

async function detectEnvPath(container, containerName) {
  const overrides = getOverrides();
  if (overrides[containerName]) {
    // Verify override path exists
    const { stderr } = await execInContainer(container, ['cat', overrides[containerName]]);
    if (!stderr.includes('No such file')) {
      return overrides[containerName];
    }
  }

  for (const p of DEFAULT_ENV_PATHS) {
    try {
      const { stdout, stderr } = await execInContainer(container, ['cat', p]);
      if (stdout.length > 0 && !stderr.includes('No such file')) {
        return p;
      }
    } catch {
      // path doesn't exist, try next
    }
  }
  return null;
}

async function listContainers() {
  const containers = await docker.listContainers();
  const results = [];

  for (const info of containers) {
    const name = info.Names[0].replace(/^\//, '');
    const container = docker.getContainer(info.Id);
    let envPath = null;
    let varCount = 0;

    try {
      envPath = await detectEnvPath(container, name);
      if (envPath) {
        const { vars } = await readEnv(info.Id, envPath);
        varCount = vars.length;
      }
    } catch {
      // container might not support exec
    }

    results.push({
      id: info.Id,
      name,
      status: info.State,
      envPath,
      varCount,
    });
  }

  return results;
}

async function readEnv(containerId, envPath) {
  const container = docker.getContainer(containerId);
  const { stdout } = await execInContainer(container, ['cat', envPath]);
  const raw = stdout;
  const vars = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    vars.push({
      key: trimmed.substring(0, eqIndex),
      value: trimmed.substring(eqIndex + 1),
    });
  }

  return { vars, raw };
}

async function writeEnv(containerId, envPath, vars) {
  const container = docker.getContainer(containerId);

  // Backup existing file
  await execInContainer(container, ['cp', envPath, envPath + '.bak']);

  // Serialize vars to .env format
  const content = vars.map((v) => `${v.key}=${v.value}`).join('\n') + '\n';

  // Build in-memory tar
  const pack = tar.pack();
  pack.entry({ name: path.basename(envPath) }, content);
  pack.finalize();

  // Write into container
  await container.putArchive(pack, { path: path.dirname(envPath) });

  return { success: true, backed_up: envPath + '.bak' };
}

async function restartContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.restart();
  return { success: true };
}

module.exports = { listContainers, readEnv, writeEnv, restartContainer };
