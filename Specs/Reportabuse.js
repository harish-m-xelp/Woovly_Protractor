var login = require('../PO/LoginPO');
var report_abuse = require('../PO/ReportabusePO');
var data = require('../conf.js');

describe('Woovly Report Abuse Module', function() {

    it('Positive Case1 :- Report Abuse for given options', async function() {
      await login.Get_Email_Login(data.config.params.url,data.config.params.userEmailid,data.config.params.userEmailPass);
      browser.sleep(3000);
      await report_abuse.Get_Report_Abuse1();
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Abuse reported successfully');
      console.log("Positive Case1 :- Report Abuse for given options"+" ==> "+"Abuse Reported Successfully....");
    });

    it('Positive Case2 :- Report Abuse from other options', async function() {
      await report_abuse.Get_Report_Abuse2("Test Report Abuse");
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Abuse reported successfully');
      console.log("Positive Case2 :- Report Abuse from other options"+" ==> "+"Abuse Reported Successfully....");
    });

    it('Negative Case1 :- Without Selecting any options', async function() {
      await report_abuse.Get_Report_Abuse3();
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Please select reason for reporting abuse');
      console.log("Negative Case1 :- Without Selecting any options"+" ==> "+"Error message validated successfully without selecting any options....");
    });

    it('Negative Case2 :- Withut Entering others Text Box', async function() {
      await report_abuse.Get_Report_Abuse4();
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Please enter reason for deletion');
      console.log("Negative Case2 :- Without Entering others Text Box"+" ==> "+"Error message validated for others successfully....");
    });


});