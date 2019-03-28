var login = require('../PO/LoginPO');
var invite_friend = require('../PO/InvitePO');
var data = require('../conf.js');
browser.waitForAngularEnabled(true);

describe('Woovly Invite Friend Module',  function() {
    it('Positive Case1 :- Enter valid Email-id', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(3000);
      await invite_friend.Get_Invite_Friends1(data.config.params.userGmailid);
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Invitation sent successfully');
      console.log("Positive Case1 :- Enter valid Email-id"+" ==> "+"Friends Invited Successfully....");
    });

    // xit('Positive Case2 :- Google Invite', async function() {
    //   browser.waitForAngularEnabled(false);
    //   await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
    //   browser.sleep(3000);
    //   await invite_friend.Get_Google_Invite_Friends(data.config.params.inviteEmail,data.config.params.invitePass);
    //   browser.sleep(3000);
    //   expect(await element(by.className("toast-message")).getText()).toEqual('Invitation sent successfully');
    //   console.log("Positive Case2 :- Google Invite"+" ==> "+"Friends Invited Successfully via google contacts....");
    // });

    it('Negative Case1 :- Enter In-valid Email-id', async function() {
      await invite_friend.Get_Invite_Friends2("harish123");
      browser.sleep(2000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Please enter valid email address');
      console.log("Negative Case1 :- Enter In-valid Email-id"+" ==> "+"Error message for Invalid Email-id validated Successfully....");
    });

    it('Negative Case2 :- After Removing Email-id', async function() {
      await invite_friend.Get_Invite_Friends3(data.config.params.userGmailid);
      browser.sleep(1000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Email remove successfully');
      console.log("Negative Case2 :- After Removing Email-id"+" ==> "+"Toast Message for Removing Email-id validated Successfully....");
    });
  
});
