var login = require('../PO/LoginPO');
var data = require('../conf.js');
// browser.waitForAngularEnabled(true);

describe('Woovly Login Module',  function() {

    it('Woovly Email Login', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(3000);
      expect(await browser.getTitle()).toEqual('test.14 - Feed');
      browser.sleep(3000);
      console.log("Logged in Successfully...");
      await login.logOut();
    });

    // it('Verify Title After Logout',async function() {
    //   await login.logOut();
    //   browser.sleep(3000);
    //   expect(await browser.getTitle()).toEqual('Woovly.com - Login or Sign Up - To Create Your Bucket List');
    // });

});
