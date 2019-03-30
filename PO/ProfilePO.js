var Profile = function () {

    const click_user_icon = $('[ng-show="loggedInUser"]');
    const click_profile_dropdown = $('[class="sub_tooltip icon  ic-person align_center"]');
    const click_profile_pic =  element(by.className("absolute_panel semibold dn_mobile"));
    const change_photo = element(by.className("save-edit-profile bolder mr_5 poR"));
    const image_path = element(by.id("upimage"));
    const click_on_edit = element(by.id("editMode"));
    const click_bio = element(by.id("userInfo1"));
    const click_gear = $('[ng-model="addedGear"]');
    const click_award = $('[ng-model="addedAward"]');
    const click_personal_info = element(by.id("pp2"));
    const click_mobile_no = $('[ng-model="userData.user[0].mobile"]');
    const click_on_save_changes = $('[ng-click="saveChanges($event);;manageScroll()"]');

    //==================== Output Profile Fiunction  ====================

    async function clickEnterButton(){
        await browser.actions().sendKeys(protractor.Key.ENTER).perform();
    }

    async function uploadProfilePic(image){
        console.log("heloo3922")
        await image_path.sendKeys(image);
        console.log("heloo")
        await browser.actions().sendKeys(protractor.Key.ENTER).perform();
    }

    this.Get_Profile_Details = async function (bio, gear, award, mobile,profilePic) {
        await click_user_icon.click();
        browser.sleep(1000);
        await click_profile_dropdown.click();
        browser.sleep(4000);
        await click_profile_pic.click();
        browser.sleep(2000);
        await change_photo.click();
        browser.sleep(1000);
        await uploadProfilePic(profilePic);
        browser.sleep(8000);
        // change_photo.click().then(function () {
        //     image_path.sendKeys("/home/harish1705/Downloads/3.jpeg", protractor.Key.ENTER);
        //   });

        await click_on_edit.click();
        browser.sleep(1000);
        await click_bio.click();
        browser.sleep(1000);
        await click_bio.sendKeys(bio);
        browser.sleep(1000);
        await click_gear.click();
        browser.sleep(1000);
        await click_gear.sendKeys(gear);
        await clickEnterButton();
        browser.sleep(1000);
        await click_award.click();
        browser.sleep(1000);
        await click_award.sendKeys(award);
        await clickEnterButton();
        browser.sleep(1000);
        await click_personal_info.click();
        browser.sleep(1000);
        await click_mobile_no.click();
        browser.sleep(1000);
        await click_mobile_no.clear();
        browser.sleep(1000);
        await click_mobile_no.sendKeys(mobile);
        browser.sleep(1000);
        await click_on_save_changes.click();

    };

};

module.exports = new Profile();
