'use strict';

const request = require('request');
const cheerio = require('cheerio');

//Sample XML to test with.
const str = `<BuildingBlocks>
  <ContentDefinitions>
    <ContentDefinition Id="api.signuporsignin">
<LoadUri>http://jsonplaceholder.typicode.com/posts/1</LoadUri>
    </ContentDefinition>
    <ContentDefinition Id="api.localaccountsignup">
<LoadUri>http://jsonplaceholder.typicode.com/posts/2</LoadUri>
    </ContentDefinition>
  </ContentDefinitions>
    <ContentDefinition Id="api.localaccountsignout">
<LoadUri>http://jsonplaceholder.typicode.com/posts/3</LoadUri>
    </ContentDefinition>
  </ContentDefinitions>
</BuildingBlocks>`;

const validateUrls = async (str) => {
  const temp = [];
  const $ = cheerio.load(str);
  const urlsToValidate = $('BuildingBlocks').find('LoadUri');
  urlsToValidate.each(function(i, elem) {
    //console.log(`Processing url: ${$(this).text()}`);
    temp.push(new Promise((resolve, reject) => {
      request({
          url: $(this).text(),
          json: true,
      }, (error, request, body) => {
          if (!error && request.statusCode === 200) {
            //console.log(`success: ${request.request.href}`);
            resolve(true);
          } else {
            /*
            if (!error && request.statusCode !== 200) {
            console.log(`failed: ${request.request.href}`);
            } else {
              console.log(error.message);
            }
            */
            reject(false);
          }
      });
    }));
  });
  return await Promise.all(temp).then(values => { return true; }).catch(error => { return false; });
}

//Sample method for testing.
validateUrls(str).then(results => {
  console.log(results);
});

module.exports = validateUrls;
