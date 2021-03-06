var login = require('../PO/LoginPO');
var data = require('../conf.js');
browser.waitForAngularEnabled(false);

describe('Woovly Login Module', function() {

    it('Woovly Facebook Login', async function() {
      await login.Get_Facebook_Login(data.config.params.url,data.config.params.userfbEmail,data.config.params.userfbPass);
      browser.sleep(10000);
      expect(await browser.getTitle()).toEqual('harish.adhavan - Feed');
    });
  
    it('Verify Title After Logout', async function() {
        await login.logOut();
        browser.sleep(3000);
        expect(await browser.getTitle()).toEqual('Woovly.com - Login or Sign Up - To Create Your Bucket List');
      });
  
});