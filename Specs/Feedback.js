var login = require('../PO/LoginPO');
var feed_back = require('../PO/FeedbackPO');
var data = require('../conf.js');

describe('Woovly Feedback Module',  function() {

    it('case1 :- With User Feedback', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(3000);
      await feed_back.Get_Feedback1("Test here with Feedback");
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Thanks for Your Feedback!');
      console.log("case1 :- Feedback Module"+" ==> "+"Feedback Submitted Successfully....");
    });

    it('case2 :- Without User information',async function() {
      await feed_back.Get_Feedback2();
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Please give some feedback');
      console.log("case2 :- Feedback Module"+" ==> "+"Feedback Error Message validated Successfully....");
    });
    
});