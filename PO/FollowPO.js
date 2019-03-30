var FollowUser = function() {

    const click_Suggested_people_follow = $('[ng-click="followSuggestedUser($event,1,sppl.uid,sppl.name)"]');
    const click_post_follow = $('[ng-click="followUserPost($event,1,feed.addeduser_uid,feed.addedusername)"]');
    const hamburger_menu = element(by.xpath("//div[@class='icon ic-more-vertical-fill makeWhite usesMobile ml_10 cursor_pointer poR mt_1']"));
    const click_justask = element(by.xpath("//div[@class='sub_tooltip  icon  ic-question align_center']"));
    
// ============= Follow Output Function ==============

    this.SuggestedPeopleFollow =  async function() {
        await click_Suggested_people_follow.click();
        browser.sleep(2000);
    };

    this.MoveToJustAskPage = async function() {
        await hamburger_menu.click();
        browser.sleep(2000);
        await click_justask.click();
        browser.sleep(4000);
    }

    this.PostFollow =  async function() {
        await click_post_follow.click();
        browser.sleep(2000);
    };

    this.PostUnFollow =  async function() {
        await click_post_follow.click();
        browser.sleep(2000);
    };

};

module.exports = new FollowUser();