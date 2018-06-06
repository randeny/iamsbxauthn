'use strict';

const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

//source directory and targetEnvironment should be defined as a VSTS environment variable.
const source = process.env.target || '.'; //path to where the files are located.
const targetEnvironment = process.env.targetEnvironment || 'iamsbxauthn';
const buildId = process.env.buildId || '000'; //VSTS build id

let tokenFile = 'environments.json';

const getLocalPolicies = ((path) => {
    const files = fs.readdirSync(path);
    return files.filter((file) => {
      return (file.includes('B2C_1A_') && file.endsWith('.xml')); //Could additionally filter out on tenant.  If need be...
    });
});

const getFileContent = ((path) => {
    return fs.readFileSync(path, 'utf8');
});

const detokenize = (source, data) => {
  const template = handlebars.compile(source);
  return template(data);
}

const persistExistingPolicy = (name, content) => {
  fs.writeFileSync(name, content, (err) => {
    if (err) throw err;
    console.log(`${name} has been persisted to the file system.`);
  });
}

//Program starts here!
tokenFile = getFileContent(path.join(source, tokenFile));
const tokens = JSON.parse(tokenFile);
getLocalPolicies(source).forEach(policy => {
    const localPolicy = getFileContent(path.join(source, policy));
    tokens[targetEnvironment].buildId = buildId;
    const detokenizedPolicy = detokenize(localPolicy, tokens[targetEnvironment]); 
    persistExistingPolicy(policy, detokenizedPolicy);
});
//Finished.


//Utility code below.  Basically to handle any possible shutdown situation.
function exitHandler(options = { cleanup: true }, err) {
    if (options.cleanup) {
    }
    if ((typeof err != 'undefined') && (err)) console.log(err.stack); //To catch a failed cleanup.
    if ((typeof options.exit != 'undefined') && (options.exit)) process.exit(0);
};

//catches ctrl+c and kill like events
process.on('SIGINT', exitHandler.bind(null, {
    cleanup: true,
    exit: true
})); // ctrl+c

process.on('SIGTERM', exitHandler.bind(null, {
    cleanup: true,
    exit: true
})); // kill

//Catch unhandledRejections and throw an uncaughtException
process.on('unhandledRejection', function(reason, p) {
    throw reason;
});

//Catch uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
    cleanup: true,
    exit: true
}));
