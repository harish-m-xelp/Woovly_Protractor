
class WoovlyLogin {

    login_button = element(by.xpath("//div[@class='landing-nav regular opacity50 transition300']"));
    click_login = element(by.id("loginspan"));
    email = element(by.id("email_Id"));
    password = element(by.xpath("(//input[@type='password'])[5]"));
    sign_in = element(by.xpath("//div[@class='landing-button-signup  f_l15Imp f_m14 f_s14 transition300 cursor_pointer']"));
    user_icon = element(by.xpath("//div[@class='userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR']"));
    logout = element(by.xpath("//div[@class='sub_tooltip icon ic-log-out logout_icon_grey bBtmNone cursor_pointer  align_center forMain']"));
    google_button = element(by.id("googleLbtn2"));
    google_email =  element(by.xpath("//input[@id='identifierId']"));
    google_next = element(by.xpath("(//span[@class='RveJvd snByac'])[1]"));
    google_password = element(by.xpath("(//input[@class='whsOnd zHQkBf'])[1]"));
    fb_button = element(by.id("fbBtnGlobal"));
    fb_email = element(by.xpath("(//input[@id=\"email\"])[1]"));
    fb_password = element(by.xpath("(//input[@id=\'pass\'])[1]"));
    fb_login = element(by.xpath("(//input[@id='u_0_0'])[1]"));
    close_app = $('[onclick="closeAddPart()"]');

    

// ============ Welcome to Woovly ============

    async getWoovly(url) {
      await browser.get(url);
    };

// ============ Email login =============

    async loginButton() {
      await this.login_button.click();
    };

    async clickLogin() {
      await this.click_login.click();
    };

    async emailClick() {
      await this.email.click();
    };

    async emailSend(email_id) {
      await this.email.sendKeys(email_id);
    };

    async passwordClick() {
      await this.password.click();
    };

    async passwordSend(Pass) {
      await this.password.sendKeys(Pass);
    };

    async signIn() {
      await this.sign_in.click();
    };

    async closeApp() {
     await this.close_app.isDisplayed().then(function (isVisible) {
      if (isVisible) {
        this.close_app.click();
         console.log("App Closed Successfully...");
        } 
      else{
            console.log("Element not Visible");
          }
      });
    };

// ============ Output Email Function ============

    async Get_Email_Login (url,email,pass) {
      await this.getWoovly(url);
      browser.sleep(2000);
      await this.loginButton();
      browser.sleep(2000);
      await this.clickLogin();
      await this.emailClick();
      await this.emailSend(email);
      await this.passwordClick();
      await this.passwordSend(pass);
      await this.signIn();
      browser.sleep(6000);
      await this.closeApp();
      browser.sleep(2000);
    };
// ============= Gmail login ==============

    async googleButton() {
      await this.google_button.click();
        };

    async googleEmail(email) {
      await this.google_email.click();
      await this.google_email.sendKeys(email);
    };

    async googleNext() {
      await this.google_next.click();
    };

    async googlePassword(Pass) {
      await this.google_password.click();
      await this.google_password.sendKeys(Pass);
    };

// ============ Output Gmail Function ============

    async Get_Gmail_Login (url,gmail,pass) {
      await this.getWoovly(url);
      await this.loginButton();
      browser.sleep(2000);
      await this.googleButton();
      browser.sleep(3000);
      browser.getAllWindowHandles().then(async function(handles){
         popupHandle = handles[1];
        browser.switchTo().window(popupHandle);
        await this.googleEmail(gmail);
        await this.googleNext();
        browser.sleep(2000);
        await this.googlePassword(pass);
        await this.googleNext();
        browser.switchTo().window(handles[0]);
        browser.sleep(10000);
        await this.closeApp();
        browser.sleep(2000);
        });
  };

// ============= Facebook login ==============

    async fbButton() {
      await this.fb_button.click();
    };

    async fbEmail(email) {
      await this.fb_email.click();
      await this.fb_email.sendKeys(email);
    };

    async fbPassword(Pass) {
      await this.fb_password.click();
      await this.fb_password.sendKeys(Pass);
    };

    async fbLogin() {
      await this.fb_login.click();
    };

// ============ Output Facebook Function ============

async Get_Facebook_Login (url,email,pass) {
      await this.getWoovly(url);
      await loginButton();
      browser.sleep(2000);
      await fbButton();
      browser.sleep(3000);
      browser.getAllWindowHandles().then(function(handles){
         popupHandle = handles[1];
        browser.switchTo().window(popupHandle).then(async function()
        {
          await this.fbEmail(email);
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

    async System_Logout() {
          await user_icon.click();
          await logout.click();
        };

    logOut = async function() {
          await System_Logout();
    }

//For random number
    getRandomInt = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

// ============= Google invite Friend =================== 

     google_invite_button = element(by.xpath("//div[@class='fleft f_l12 f_s12 f_m12 regular color_new align_center inviteFrns googlePlus cursor_pointer colour_white pl_20 pr_30 br_3']"));
    
    async googleInviteButton() {
      await google_invite_button.click();
    };

// Output Function for Invite Friend

  Get_Google_Invite_Login = async function(gmail,pass) {
      await googleInviteButton();
      browser.sleep(3000);
        browser.getAllWindowHandles().then(async function(handles){
         popupHandle = handles[1];
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
  

