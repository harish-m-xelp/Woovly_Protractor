var login = require('../PO/LoginPO');
var ask_question = require('../PO/AskquestionPO');
var data = require('../conf.js');

browser.waitForAngularEnabled(true);

describe('Woovly Ask Question Module',  function() {

    beforeAll(async function() {
        await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
    });
      
    it('Case 1: Existing Bucket with Video & Question Added', async function() {
      browser.sleep(4000);
      await ask_question.Get_Question_With_Existing_Bucket1("Harish");
      browser.sleep(2000);
      console.log("Post 1 Created Successfully...");
      expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });
    
    it('Case 2: Existing Bucket with Images & Question Added', async function() {
        browser.refresh();
        await ask_question.Get_Question_With_Existing_Bucket2("Amit Dev");
        browser.sleep(2000);
        console.log("Post 2 Created Successfully...");
        expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });

      it('Case 3: Existing Bucket with only Question Added', async function() {
        browser.refresh();
        await ask_question.Get_Question_With_Existing_Bucket3("Shivam Parashar");
        browser.sleep(2000);
        console.log("Post 3 Created Successfully...");
        expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });

      it('Case 4: Created New Bucket with Video & Question Added', async function() {
        browser.refresh();
        await ask_question.Get_Question_With_New_Bucket4("Akash Singh");
        browser.sleep(2000);
        console.log("Post 4 Created Successfully...");
        expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });

      it('Case 5: Created New Bucket with Images & Question Added', async function() {
        browser.refresh();
        await ask_question.Get_Question_With_New_Bucket5("Utsav Tagra");
        browser.sleep(2000);
        console.log("Post 5 Created Successfully...");
        expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });

      it('Case 6: Created New Bucket with only Question Added', async function() {
        browser.refresh();
        await ask_question.Get_Question_With_New_Bucket6("Shubham Gupta");
        browser.sleep(2000);
        console.log("Post 6 Created Successfully...");
        expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });

    it('Case 7: Created New Bucket with Images & Question Added & without TagUser', async function() {
        browser.refresh();
        await ask_question.Get_Question_With_Existing_Bucket7();
        browser.sleep(2000);
        console.log("Post 7 Created Successfully...");
        expect(await element(by.className("toast-message")).getText()).toEqual('Question Asked has been Posted successfully');
    });

});
