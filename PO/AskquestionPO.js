var AskQuestion = function() {
    var data = require('../conf.js');
    var path = require('path');
    var fs = require('fs');
    var user_login = require('../PO/LoginPO');

    var click_add = element(by.xpath("(//div[@class='w_a poR'])[1]"));
    var click_ask_question = $('[ng-click="openAskFlow()"]');
    var click_create_new = element(by.xpath("(//div[@class='col l1_2 m1_2 s1_2  cursor_pointer fleft prb1_5'])[2]"));
    var enter_new_bli = element(by.id("bliSearchAsk"));
    var bli_done = $('[ng-click="chapterNext11()"]');
    var click_bLI = $('[ng-click="setSelectedBLI(bli)"]');
    var click_ask = $('[ng-click="chapterFront31()"]');
    var click_inner_ask = element(by.id("actualPostTxtMbAsk"));
    var click_done = $('[ng-click="chapterFront21()"]');
    var upload_image = $('[ng-click="uiRese11t()"]');
    var click_next = $('[ng-click="Askanyone()"]');
    var click_tag_user = $('[ng-hide="taggedUsersAsk.length > 0"]');
    var send_tag_user = element(by.id("userSearchAsk"));
    var select_user = element(by.xpath("(//div[@class=' panel_shape display_flex flexdir_row align_center poR'])[1]"));
    var click_tag_done = $('[ng-click="chapterNext33()"]');
    var click_submit = $('[ng-click="addAskPost($event)"]');

// ============ Ask Question =============

    async function clickAdd() {
        await click_add.click();
    };

    async function clickAskQuestion() {
        await click_ask_question.click();
    };

    async function clickCreateNew() {
        await click_create_new.click();
    };

    async function enterNewBLI(BLI_Name) {
        await enter_new_bli.sendKeys(BLI_Name);
    };

    async function bliDone() {
        await bli_done.click();
    };
// Add Existing
    async function clickBLI() {
        await click_bLI.click();
    };

    async function clickAsk() {
        await click_ask.click();
    };

    async function sendAsk(question) {
        await click_inner_ask.sendKeys(question);
    };

    async function clickDone() {
        await click_done.click();
    };

    async function clickNext() {
        await click_next.click();
    };

    async function clickTagUser() {
        await click_tag_user.click();
    };

    async function sendTagUser(user) {
        await send_tag_user.click();
        await send_tag_user.sendKeys(user);
    };

    async function selectUser() {
        await select_user.click();
    };  

    async function clickTagDone() {
        await click_tag_done.click();
    };

    async function clickSubmit() {
        await click_submit.click();
    };

// Random Video From Folder
    async function uploadVideo(dirpath, image_count) {
        var dirabsolutePath = path.resolve(__dirname, dirpath);
        console.log(dirabsolutePath);
        fs.readdir(dirabsolutePath, (err, files) => {
        browser.sleep(1000);
        for (i = 0; i < image_count; i++) {
            console.log(files[i]);
            var j = user_login.getRandomInt(1, files.length - 1);
            var fullPath = path.resolve(dirabsolutePath, files[j]);
            console.log(fullPath);
            var absolutePath = path.resolve(__dirname, fullPath);
            var fileElem = element(by.id("forBliAsk_vid"));
            fileElem.sendKeys(absolutePath);
            browser.sleep(7000);
            }
        });
    };

// Random Images From Folder
    async function uploadImages(dirpath, image_count) {
        var dirabsolutePath = path.resolve(__dirname, dirpath);
        console.log(dirabsolutePath);
        fs.readdir(dirabsolutePath, (err, files) => {
        browser.sleep(1000);
        for (i = 0; i < image_count; i++) {
            console.log(files[i]);
            var j = user_login.getRandomInt(1, files.length - 1);
            var fullPath = path.resolve(dirabsolutePath, files[j]);
            console.log(fullPath);
            var absolutePath = path.resolve(__dirname, fullPath);
            var fileElem = element(by.xpath("//input[@id='forBliAsk']"));
            fileElem.sendKeys(absolutePath);
            browser.sleep(7000);
            }
        });
    };  

// ============= Output Ask Question Function ==============

//Post 1:- Existing Bucket with Video & Question Added
    this.Get_Question_With_Existing_Bucket1 = async function(taguser) {
        await clickAdd();
        await clickAskQuestion();
        console.log('inside')
        await clickBLI();
        browser.sleep(2000);
        await clickAsk();
        browser.sleep(2000);
        await sendAsk("Post 1:- Existing Bucket with Video & Question Added, Post id "+ data.config.params.ran +" "+"& Post Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await uploadVideo(data.config.params.uploadVideo,1);
        // await uploadVideo(video);
        browser.sleep(8000);
        await clickNext();
        await clickTagUser();
        browser.sleep(2000);
        await sendTagUser(taguser);
        await selectUser();
        await clickTagDone();
        browser.sleep(3000);
        await clickSubmit();
    };

// Post 2:- Existing Bucket with Images & Question Added
    this.Get_Question_With_Existing_Bucket2 = async function(taguser) {
        await clickAdd();
        await clickAskQuestion();
        browser.sleep(2000);
        await clickBLI();
        await clickAsk();
        await sendAsk("Post 2:- Existing Bucket with Images & Question Added, Post id "+ data.config.params.ran1 +" "+"& Post Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await uploadImages(data.config.params.uploadImage,5);
        browser.sleep(12000);
        await clickNext();
        await clickTagUser();
        browser.sleep(2000);
        await sendTagUser(taguser);
        await selectUser();
        await clickTagDone();
        browser.sleep(3000);
        await clickSubmit();
      };

// Post 3:- Existing Bucket with only Question Added
      this.Get_Question_With_Existing_Bucket3 = async function(taguser) {
        await clickAdd();
        await clickAskQuestion();
        await clickBLI();
        browser.sleep(2000);
        await clickAsk();
        browser.sleep(2000);
        await sendAsk("Post 3:- Existing Bucket with only Question Added, Post id "+ data.config.params.ran2 +" "+"& Post Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await clickNext();
        await clickTagUser();
        browser.sleep(2000);
        await sendTagUser(taguser);
        await selectUser();
        await clickTagDone();
        browser.sleep(3000);
        await clickSubmit();
      };

//   Post 4:- Created New Bucket with Video & Question Added
      this.Get_Question_With_New_Bucket4 = async function(taguser) {
        await clickAdd();
        await clickAskQuestion();
        await clickCreateNew();
        await enterNewBLI("Automated Question Bucket id " + data.config.params.ran );
        await bliDone();
        browser.sleep(2000);
        await clickAsk();
        browser.sleep(2000);
        await sendAsk("Post 4:- Created New Bucket with Video & Question Added, Post id "+ data.config.params.ran3 +" "+"& Post Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await uploadVideo(data.config.params.uploadVideo,1);
        browser.sleep(8000);
        await clickNext();
        await clickTagUser();
        browser.sleep(2000);
        await sendTagUser(taguser);
        await selectUser();
        await clickTagDone();
        browser.sleep(3000);
        await clickSubmit();
      };

//   Post 5:- Created New Bucket with Images & Question Added
      this.Get_Question_With_New_Bucket5 = async function(taguser) {
        await clickAdd();
        await clickAskQuestion();
        await clickCreateNew();
        await enterNewBLI("Automated Question Bucket id " + data.config.params.ran );
        await bliDone();
        browser.sleep(2000);
        await clickAsk();
        await sendAsk("Post 5:- Created New Bucket with Images & Question Added, Post id "+ data.config.params.ran +" "+"& Post Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await uploadImages(data.config.params.uploadImage,3);
        browser.sleep(10000);
        await clickNext();
        await clickTagUser();
        browser.sleep(2000);
        await sendTagUser(taguser);
        await selectUser();
        await clickTagDone();
        browser.sleep(3000);
        await clickSubmit();
      };

// Post 6:- Created New Bucket with only Question Added
      this.Get_Question_With_New_Bucket6 = async function(taguser) {
        await clickAdd();
        await clickAskQuestion();
        await clickCreateNew();
        await enterNewBLI("Automated Question Bucket id " + data.config.params.ran );
        await bliDone();
        browser.sleep(2000);
        await clickAsk();
        await sendAsk("Post 6:- Created New Bucket with only Question Added, Post id "+ data.config.params.ran1 +" "+"& Posted Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await clickNext();
        await clickTagUser();
        browser.sleep(2000);
        await sendTagUser(taguser);
        await selectUser();
        await clickTagDone();
        browser.sleep(3000);
        await clickSubmit();
      };

//   Post 7:- Existing Bucket with Images & Question Added withour Tag User
      this.Get_Question_With_Existing_Bucket7 = async function() {
        await clickAdd();
        await clickAskQuestion();
        browser.sleep(2000);
        await clickBLI();
        await clickAsk();
        await sendAsk("Post 7:- Existing Bucket with Images & Question Added without Tag User, Post id "+ data.config.params.ran2 +" "+"& Post Created on"+ " "+ Get_Current_Time());
        await clickDone();
        browser.sleep(2000);
        await uploadImages(data.config.params.uploadImage,2);
        browser.sleep(6000);
        await clickNext();
        browser.sleep(3000);
        await clickSubmit();
      };

      function Get_Current_Time() {
        var d = new Date();
        var date = d.getDate();
        var m = d.getMonth();
        var month = m+1;
        var year = d.getFullYear();
        var hour = d.getHours();
        var mins = d.getMinutes();
        var secs = d.getSeconds();

        return (date+"/"+month+"/"+year+" "+"@"+" "+hour+":"+mins+":"+secs);
    }
};
module.exports = new AskQuestion();