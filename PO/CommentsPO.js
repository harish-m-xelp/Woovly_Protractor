var FeedsComment = function() {

    const click_comment = $('[ng-keyup="checkPress($event,feed.pid,feed.upcmt)"]');
    const post_comment = $('[ng-click="addComment(feed.upcmt, feed.pid, feed.bid, feed.pid , feed.uid,$event,feed.sid,0,feed.type_flag)"]');
    const select_user_frm_dropdown = $('[ng-click="setUser(sf,feed.pid)"]');
    const select_user_frm_reply_dropdown = $('[ng-click="setUser(sfRep,cmt.cid)"]');
    const click_reply = $('[ng-click="openReply($event,cmt.cid,1)"]');
    const click_reply_comment = $('[ng-keyup="checkPress($event,cmt.cid,cmt.upComment)"]');
    const post_reply_comment = $('[ng-click="addComment(cmt.upComment, feed.pid, feed.bid, feed.pid , feed.uid,$event,feed.sid,cmt.cid ,feed.type_flag)"]');

// ============= Comments Output Function ==============

    this.MainCommentOnPost =  async function(main_comment) {
        await click_comment.click();
        browser.sleep(2000);
        await click_comment.sendKeys(main_comment)
        browser.sleep(2000);
        await post_comment.click();
        browser.sleep(3000);
    };

    this.ReplyCommentOnPost =  async function(reply_comment) {
        await click_reply.click();
        browser.sleep(2000);
        await click_reply_comment.sendKeys(reply_comment)
        browser.sleep(2000);
        await post_reply_comment.click();
        browser.sleep(3000);
    };

    this.TagUserInMainCommentOnPost =  async function(tag_user_main_comment) {
        await click_comment.click();
        browser.sleep(2000);
        await click_comment.sendKeys("@"+tag_user_main_comment)
        browser.sleep(5000);
        await select_user_frm_dropdown.click();
        browser.sleep(3000);
        await post_comment.click();
        browser.sleep(3000);
    };

    this.TagUserInReplyCommentOnPost =  async function(tag_user_reply_comment) {
        await click_reply.click();
        browser.sleep(2000);
        await click_reply_comment.sendKeys("@"+tag_user_reply_comment)
        browser.sleep(5000);
        await select_user_frm_reply_dropdown.click();
        browser.sleep(3000);
        await post_reply_comment.click();
        browser.sleep(3000);
    };

};

module.exports = new FeedsComment();