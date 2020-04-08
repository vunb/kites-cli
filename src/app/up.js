'use strict'
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const utile = require("utile");
const chalk = require('chalk')

function getMainApp(app) {
  // default
  let main = app;
  let cwd = process.cwd();
  if (!app) {
    const pkgInfo = path.join(cwd, 'package.json')

    if (fs.existsSync(pkgInfo) && require(pkgInfo).main) {
      main = require(pkgInfo).main
      console.log(`App script is detected in package info: ${chalk.green(main)}`)
    }
    if (!main) {
      // use default elevator @kites/cli/main script.
      main = path.resolve(__dirname, '../main.js');
    }
  }

  console.log(`App script is starting: ${chalk.green(main)}`)
  const script = path.resolve(process.cwd(), main);

  // check app script exists!
  if (!fs.existsSync(script) && !fs.existsSync(script + '.js') && !fs.existsSync(script + '.ts')) {
    throw new Error('Script not found: ' + script);
  } else if (path.extname('.ts')) {
    // TODO: register ts-node
  }

  return { script, cwd };
}

/**
 * Startup kites application
 *
 * @param {String} app name of the app created by @kites/cli
 * @param {Object} options command options
 */
function cmdUp(app, options) {
  try {

    const { script, cwd } = getMainApp(app);
    options = options || {};
    const pid = options.pid || utile.randomString(4).replace(/^\-/, '_');
    const logFile = options.logFile || (pid + '.log');
    const pidFile = options.pidFile || (pid + '.pid');
    const workDir = options.workDir || cwd;

    console.log(`$ starting: ${chalk.green(script)}, as a daemon: ${options.daemon}, pid: ${pidFile}`)

    const processOpts = {
      cwd: workDir,
      detached: false,
      stdio: ['pipe', process.stdout, process.stderr],
    }

    if (options.daemon) {
      const outFD = fs.openSync(logFile, 'a');
      const errFD = fs.openSync(logFile, 'a');
      // start application as a daemon
      Object.assign(processOpts, {
        detached: true,
        stdio: ['ipc', outFD, errFD]
      })
    }

    const monitor = spawn(process.execPath, [script], processOpts)

    monitor.on('exit', function (code, signal) {
      if (code === 0) {
        console.log(`${chalk.green('info:')} The app is stopped with success code!`);
      } else {
        console.error(`kites: child process exited with code: ${code} and signal ${signal}`)
      }
    })

    // monitor.send(options);

    if (options.daemon) {
      // close the ipc communication channel with the monitor
      // otherwise the corresponding events listeners will prevent
      // the exit of the current process (observed with node 0.11.9)
      monitor.disconnect();

      // make sure the monitor is unref() and does not prevent the
      // exit of the current process
      monitor.unref();
    }

    return Promise.resolve({
      name: script,
      workDir: workDir,
      daemon: options.daemon,
    })
  } catch (error) {
    return Promise.reject(error);
  }

}
module.exports = cmdUp
