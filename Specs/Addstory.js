var login = require('../PO/LoginPO');
var add_story = require('../PO/AddstoryPO');
var data = require('../conf.js');

describe('Woovly Create Story Module', function() {

    it('Case 1:- Create Story with Existing Bucketlist & Publish', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(5000);
      await add_story.Get_New_Story1("visit goa with friends");
      browser.sleep(2000);
      expect(await browser.getTitle()).toEqual("Automated Story id"+" "+ data.config.params.ran+' - Bucket List | Woovly');
      console.log("Story Title Verified Successfully..."+"Automated Story id"+" "+ data.config.params.ran);
      browser.sleep(2000);
    });

    it('Case 2:- Create Story with Existing Bucketlist & Save', async function() {
      await add_story.Get_New_Story2("visit goa with friends");
      browser.sleep(2000);
      expect(await browser.getTitle()).toEqual("Automated Story id"+" "+ data.config.params.ran2+' - Bucket List | Woovly');
      console.log("Story Title Verified Successfully..."+"Automated Story id"+" "+ data.config.params.ran2);
      browser.sleep(2000);
    });

    it('Case 3:- Create Story with new Bucketlist & Save', async function() {
      await add_story.Get_New_Story3();
      browser.sleep(3000);
      expect(await browser.getTitle()).toEqual("Automated Story id"+" "+ data.config.params.ran1+' - Bucket List | Woovly');
      console.log("Story Title Verified Successfully..."+"Automated Story id"+" "+ data.config.params.ran1);
    });

    it('Case 4:- Create Story with new Bucketlist & Publish', async function() {
      await add_story.Get_New_Story4();
      browser.sleep(3000);
      expect(await browser.getTitle()).toEqual("Automated Story id"+" "+ data.config.params.ran3+' - Bucket List | Woovly');
      console.log("Story Title Verified Successfully..."+"Automated Story id"+" "+ data.config.params.ran3);
    });

});