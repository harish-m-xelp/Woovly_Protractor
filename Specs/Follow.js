var login = require('../PO/LoginPO');
var data = require('../conf.js');
var follow = require('../PO/FollowPO');

describe('Woovly Follow Module',  function() {

    it('Case 1: User Followed From Suggested People in Feeds', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(3000);
      await follow.SuggestedPeopleFollow();
      expect(await element(by.className("toast-message")).getText()).toContain("Followed successfully");
      console.log("Followed From Suggested People Sucessfully");
      browser.sleep(5000);
    });

    it('Case 2: User Followed From Post in Question Page', async function() {
        await follow.MoveToJustAskPage();
        browser.sleep(2000);
        await follow.PostFollow();
        expect(await element(by.className("toast-message")).getText()).toContain("Followed successfully")
        console.log("User Followed From Post Sucessfully");
        browser.sleep(3000);
      });

    it('Case 3: User Un-Followed From Post in Question Page', async function() {
        await follow.PostUnFollow();
        expect(await element(by.className("toast-message")).getText()).toContain("Unfollowed successfully")
        console.log("User Un-Followed From Post Sucessfully");
        browser.sleep(3000);
    });

});