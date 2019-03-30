var login = require('../PO/LoginPO');
var profile = require('../PO/ProfilePO');
var data = require('../conf.js');

describe('Woovly Profile Page', function() {

    it('Case :- Bio, Gear, Awards & Mobile Number Added.', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(3000);
      await profile.Get_Profile_Details(data.config.params.bio,data.config.params.gears,data.config.params.awards,data.config.params.mobile,data.config.params.uploadImage);
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Details updated successfully');
      console.log("Profile Updated Successfully");
    });

});