var login = require('../PO/LoginPO');
var data = require('../conf.js');
var comments = require('../PO/CommentsPO');

describe('Woovly Login Module',  function() {

    it('Case 1: Woovly Main Comment', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.executeScript('window.scrollTo(0,800)');
      browser.sleep(30000);
      await comments.MainCommentOnPost("Test Main Comment 1");
      console.log("Comment Posted Sucessfully");
      browser.sleep(3000);
    });

    it('Case 2: Woovly Reply Comment', async function() {
        await comments.ReplyCommentOnPost("Test Reply Comment 1");
        console.log("Reply Comment Posted Sucessfully");
        browser.sleep(3000);
    });

    it('Case 3: Tag User in Main Comment', async function() {
        await comments.TagUserInMainCommentOnPost("harish");
        console.log("Tag User Mentioned Sucessfully in Main Comment");
        browser.sleep(3000);
    });

    it('Case 4: Tag User in Reply Comment', async function() {
        await comments.TagUserInReplyCommentOnPost("shanu");
        console.log("Tag User Mentioned Sucessfully in Reply Comment");
        browser.sleep(3000);
    });

});