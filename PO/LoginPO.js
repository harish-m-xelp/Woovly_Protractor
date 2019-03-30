var WoovlyLogin = function() {
    var login_button = element(by.xpath("//div[@class='landing-nav regular opacity50 transition300']"));
    var click_login = element(by.id("loginspan"));
    var email = element(by.id("email_Id"));
    var password = element(by.xpath("(//input[@type='password'])[5]"));
    var sign_in = element(by.xpath("//div[@class='landing-button-signup  f_l15Imp f_m14 f_s14 transition300 cursor_pointer']"));
    var user_icon = $('[ng-show="loggedInUser"]');
    var logout = element(by.xpath("//div[@class='sub_tooltip icon ic-log-out logout_icon_grey bBtmNone cursor_pointer  align_center forMain']"));
    var google_button = element(by.id("googleLbtn2"));
    var google_email =  element(by.xpath("//input[@id='identifierId']"));
    var google_next = element(by.xpath("(//span[@class='RveJvd snByac'])[1]"));
    var google_password = element(by.xpath("(//input[@class='whsOnd zHQkBf'])[1]"));
    var fb_button = element(by.id("fbBtnGlobal"));
    var fb_email = element(by.xpath("(//input[@id=\"email\"])[1]"));
    var fb_password = element(by.xpath("(//input[@id=\'pass\'])[1]"));
    var fb_login = element(by.xpath("(//input[@id='u_0_0'])[1]"));
    var close_app = $('[onclick="closeAddPart()"]');
    
    

// ============ Welcome to Woovly ============

    async function getWoovly(url) {
      await browser.get(url);
    };

// ============ Email login =============

    async function loginButton() {
      await login_button.click();
    };

    async function clickLogin() {
      await click_login.click();
    };

    async function emailClick() {
      await email.click();
    };

    async function emailSend(email_id) {
      await email.sendKeys(email_id);
    };

    async function passwordClick() {
      await password.click();
    };

    async function passwordSend(Pass) {
      await password.sendKeys(Pass);
    };

    async function signIn() {
      await sign_in.click();
    };

    async function closeApp() {
     await close_app.isDisplayed().then(function (isVisible) {
      if (isVisible) {
         close_app.click();
         console.log("App Closed Successfully...");
        } 
      else{
            console.log("Element not Visible");
          }
      });
    };

// ============ Output Email Function ============

    this.Get_Email_Login =  async function(url,email,pass) {
      await getWoovly(url);
      browser.sleep(2000);
      await loginButton();
      browser.sleep(2000);
      await clickLogin();
      await emailClick();
      await emailSend(email);
      await passwordClick();
      await passwordSend(pass);
      await signIn();
      browser.sleep(6000);
      await closeApp();
      browser.sleep(10000);
    };
// ============= Gmail login ==============

    async function googleButton() {
      await google_button.click();
        };

    async function googleEmail(email) {
      await google_email.click();
      await google_email.sendKeys(email);
    };

    async function googleNext() {
      await google_next.click();
    };

    async function googlePassword(Pass) {
      await google_password.click();
      await google_password.sendKeys(Pass);
    };

// ============ Output Gmail Function ============

    this.Get_Gmail_Login = async function(url,gmail,pass) {
      await getWoovly(url);
      await loginButton();
      browser.sleep(2000);
      await googleButton();
      browser.sleep(3000);
      browser.getAllWindowHandles().then(async function(handles){
        var popupHandle = handles[1];
        browser.switchTo().window(popupHandle);
        await googleEmail(gmail);
        await googleNext();
        browser.sleep(2000);
        await googlePassword(pass);
        await googleNext();
        browser.switchTo().window(handles[0]);
        browser.sleep(10000);
        await closeApp();
        browser.sleep(2000);
        });
  };

// ============= Facebook login ==============

    async function fbButton() {
      await fb_button.click();
    };

    async function fbEmail(email) {
      await fb_email.click();
      await fb_email.sendKeys(email);
    };

    async function fbPassword(Pass) {
      await fb_password.click();
      await fb_password.sendKeys(Pass);
    };

    async function fbLogin() {
      await fb_login.click();
    };

// ============ Output Facebook Function ============

    this.Get_Facebook_Login = async function(url,email,pass) {
      await getWoovly(url);
      await loginButton();
      browser.sleep(2000);
      await fbButton();
      browser.sleep(3000);
      browser.getAllWindowHandles().then(function(handles){
        var popupHandle = handles[1];
        browser.switchTo().window(popupHandle).then(async function()
        {
          await fbEmail(email);
          await fbPassword(pass);
          await fbLogin();
          browser.switchTo().window(handles[0]);
          browser.sleep(6000);
          await closeApp();
          browser.sleep(2000);
        });
    });

  };

// ==========  Logout  ==============

    // async function System_Logout() {
    //       await user_icon.click();
    //       await logout.click();
    //     };

    this.logOut = async function() {
      await user_icon.click();
      await logout.click();
    }

//For random number
    this.getRandomInt = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

// ============= Google invite Friend =================== 

    var google_invite_button = element(by.xpath("//div[@class='fleft f_l12 f_s12 f_m12 regular color_new align_center inviteFrns googlePlus cursor_pointer colour_white pl_20 pr_30 br_3']"));
    
    async function googleInviteButton() {
      await google_invite_button.click();
    };

// Output Function for Invite Friend

  this.Get_Google_Invite_Login = async function(gmail,pass) {
      await googleInviteButton();
      browser.sleep(3000);
        browser.getAllWindowHandles().then(async function(handles){
        var popupHandle = handles[1];
        browser.switchTo().window(popupHandle);
        //Perform operations
        await googleEmail(gmail);
        await googleNext();
        browser.sleep(2000);
        await googlePassword(pass);
        await googleNext();
        browser.sleep(8000);
        //Back to Previous window
        browser.switchTo().window(handles[0]);
        browser.sleep(5000);
      });
    };

  };

module.exports = new WoovlyLogin();