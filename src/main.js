const kites = require('@kites/core');

kites.engine({
  loadConfig: true,
  appDirectory: process.cwd(),
})
  .init()
  .then(app => {
    app.logger.info('Kites application started!');
  })
  .catch(err => {
    console.error('Kites start app error: ', err);
  });
