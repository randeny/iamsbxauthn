'use strict';

const path = require('path');
const formData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

const source = process.env.target || '.';
const targetEnvironment = process.env.targetEnvironment || 'iamsbxauthn';

let tokenFile = 'environments.json';

const getFileContent = ((path) => {
    return fs.readFileSync(path, 'utf8');
});

tokenFile = getFileContent(path.join(source, tokenFile));
const tokens = JSON.parse(tokenFile);

const _internals = {
    tenant: `${tokens[targetEnvironment].tenantId}.onmicrosoft.com`,
    clientId: tokens[targetEnvironment].tenantId,
    clientSecret: process.env.B2C_CLIENT_SECRET || null,
    credentials: {
        username: tokens[targetEnvironment].credentials.username,
        password: process.env.B2C_CREDENTIALS_PASSWORD || null
    },
    scope: tokens[targetEnvironment].scope,
    localPolicies: new Map(),
    localPoliciesSource: source, //local directory where you would find B2C policies.
    targetUrl: 'https://graph.microsoft.com/testcpimtf/trustFrameworkpolicies',  //Graph API Version number needs to be provided.
    access_token: ''  //By default this doesn't exist.  We will fetch a Bearer token.
};

const getBearerToken = async (tenant, username, password, clientId, clientSecret, scope) => {
    const form = new formData();
    form.append('grant_type', 'password');
    form.append('username', `${username}@${tenant}`);
    form.append('password', password);
    form.append('client_id', clientId);
    form.append('client_secret', clientSecret);
    form.append('scope', scope);
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/Oauth2/v2.0/token`, { method: 'POST', body: form});
    if (res.ok) {
      const json = await res.json();
      const access_token = json.access_token;
      return access_token;
    } else {
      const json = await res.json();
      console.log(res.status, res.statusText);
      process.exit(0);
    }
}

const getLocalPolicies = ((path) => {
    const files = fs.readdirSync(path);
    return files.filter((file) => {
      return (file.includes('B2C_1A_') && file.endsWith('.xml'));
    });
});


const postPolicy = async (access_token, targetUrl, policy) => {
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: policy,
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/xml' }  //Add additional headers here!
    });
    if (res.ok) {
      const body = await res.text();
      console.log(`postPolicy returned: ${body}`);
      return body;
    } else {
      console.log(res.status, res.statusText);
      process.exit(0);
    }
}

getLocalPolicies(_internals.localPoliciesSource).forEach(policy => {
    const localPolicy = getFileContent(path.join(_internals.localPoliciesSource, policy));
    _internals.localPolicies.set(policy, localPolicy);
});

getBearerToken(_internals.tenant, _internals.credentials.username, _internals.credentials.password, _internals.clientId, _internals.clientSecret, _internals.scope).then(access_token => {
  _internals.access_token = access_token;
  _internals.localPolicies.forEach(policy => {  
    postPolicy(_internals.access_token, `${_internals.targetUrl}`, policy);
  });
}).catch(err => { console.log(err)});



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


