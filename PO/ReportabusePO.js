var ReportAbuse = function() {
    var click_icon = element(by.xpath("(//div[@class='icon ic-more-fill transition300 dn_mobile'])[1]"));
    var click_report = $('[ng-click="reportPost($event,feed)"]');
    var select_option = element(by.xpath("(//label[@class='pl_30 absolute_panel flex_start display_flex cursor_pointer closedn fleft ng-binding'])[1]"));
    var submit = element(by.xpath("//div[@class='f_s13 f_m13 f_s13 fright semibold reportAbuseBtn colour_white']"));
    var thanks_pop = element(by.xpath("(//div[@class='cancelUserBot semibold'])[2]"));
    var other = element(by.xpath("(//label[@class='pl_30 absolute_panel flex_start display_flex cursor_pointer closedn fleft ng-binding'])[10]"));
    var other_text = element(by.id("otherText"));
    var close_button = $('[ng-click="closeAbusePanel($event)"]');
    
    
// ============ Report Abuse =============

    async function clickIcon() {
       await click_icon.click();
    };

    async function clickReport() {
        await click_report.click();
    };

    async function selectOption() {
        await select_option.click();
    };

    async function clickOthers() {
        await other.click();
    };

    async function othersText(others_txt) {
        await other_text.click();
        await other_text.sendKeys(others_txt);
    };

    async function clickPopup() {
        await close_button.click();
    };

    async function clickSubmit() {
        await submit.click();
    };

    async function thanksPop() {
        await thanks_pop.click();
    };

// ============= Output Report Abuse Function ==============

    this.Get_Report_Abuse1 =  async function() {
        await clickIcon();
        browser.sleep(1000);
        await clickReport();
        browser.sleep(1000);
        await selectOption();
        browser.sleep(1000);
        await clickSubmit();
        browser.sleep(2000);
        await thanksPop();
    };

    this.Get_Report_Abuse2 =  async function(others_txt) {
        await clickIcon();
        await clickReport();
        browser.sleep(1000);
        await clickOthers();
        browser.sleep(1000);
        await othersText(others_txt);
        browser.sleep(1000);
        await clickSubmit();
        browser.sleep(2000);
        await thanksPop();
    };

    this.Get_Report_Abuse3 =  async function() {
        await clickIcon();
        await clickReport();
        browser.sleep(1000);
        await clickSubmit();
        browser.sleep(2000);
        await clickPopup();
    };

    this.Get_Report_Abuse4 =  async function() {
        await clickIcon();
        await clickReport();
        browser.sleep(1000);
        await clickOthers();
        browser.sleep(1000);
        await clickSubmit();
        browser.sleep(2000);
        await clickPopup();
    };

    };
module.exports = new ReportAbuse();