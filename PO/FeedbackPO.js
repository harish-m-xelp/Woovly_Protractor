var Feedback = function() {
    var hamburger_menu = element(by.xpath("//div[@class='icon ic-more-vertical-fill makeWhite usesMobile ml_10 cursor_pointer poR mt_1']"));
    var click_feedback = element(by.xpath("//div[@class='sub_tooltip  icon ic-feedback  logout_icon_grey cursor_pointer align_center forMain b_none']"));
    var your_feedback = element(by.xpath("//div[@id='descFeedback']"));
    var submit = element(by.xpath("//div[@class='ctaBtn woovly_bg1 semibold f_l12 f_m12 f_s12 br_3 align_center justify_center txt_center color_white cursor_pointer']"));
    var close_feed = $('[ng-click="dataFactory.webcloseFeedback()"]');

// ============ Feedback =============

    async function hamburgerMenu() {
        await hamburger_menu.click();
    };

    async function clickFeedback() {
        await click_feedback.click();
    };

    async function yourFeedback(feedback) {
        await your_feedback.click();
        await your_feedback.sendKeys(feedback);
    };

    async function clickSubmit() {
        await submit.click();
    };

    async function clickToClose() {
        await close_feed.click();
    };

// ============= Output Feedback Function ==============

    this.Get_Feedback1 =  async function(feedback) {
        await hamburgerMenu();
        await clickFeedback();
        browser.sleep(2000);
        await yourFeedback(feedback);
        await clickSubmit();
        browser.sleep(3000);
    };

    this.Get_Feedback2 =  async function(feedback) {
        await hamburgerMenu();
        await clickFeedback();
        browser.sleep(2000);
        await clickSubmit();
        browser.sleep(2000);
        await clickToClose();
    };
};
module.exports = new Feedback();