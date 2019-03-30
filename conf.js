// var Jasmine2HtmlReporter = require('protractor-jasmine2-html-reporter');
// var HtmlReporter = require('protractor-beautiful-reporter');
exports.config = {
  directConnect: true,
  // Capabilities to be passed to the webdriver instance.
  multiCapabilities: [{
  //   browserName: 'firefox'
  // }, {
    browserName: 'chrome',
    chromeOptions: {
      args: ['--disable-gpu','--window-size=2000,1200']
      // ======== With Headless mode ===========
      // args: ['--headless', '--disable-gpu','--window-size=2000,1200']
  },
  shardTestFiles: true,
  maxInstances: 1,       
  }],

params: {
   url: "https://alpha.woovly.com",
   ran: Math.floor(100000 + Math.random() * 900000),
   ran1: Math.floor(100000 + Math.random() * 900000),
   ran2: Math.floor(100000 + Math.random() * 900000),
   ran3: Math.floor(100000 + Math.random() * 900000),
   userEmailid: "tester@gmail.com",
   userEmailPass: "123456",
   userGmailid: "harishxelpmoc@gmail.com",
   userGmailPass : "*******",
   userfbEmail: "haarri007@gmail.com",
   userfbPass: "******", 
   inviteEmail: "harishxelpmoc@gmail.com",
   invitePass: "******",
   uploadImage: "../testData/images",
   uploadVideo: "../testData/video",
   bio: "cool used to describe a person. ... From OALD cool used with persons means: not friendly, interested or enthusiastic. calm and confident in a way that lacks respect for other people, but makes people admire you as well as disapprove.",
   gears: "Strings,Woodwind,brass",
   awards: "Grammy Awards",
   mobile: "8951327033"
 },


// Framework to use. Jasmine is recommended.
  framework: 'jasmine2',

  specs: ['./Specs/Login.js'],
  // specs: ['./Specs/Gmail_Login.js'],
  // specs: ['./Specs/Fb_Login.js'],
  // specs: ['./Specs/Login.js','./Specs/Feedback.js','./Specs/Reportabuse.js','./Specs/Invitefriend.js','./Specs/Askquestion.js','./Specs/Addstory.js'],
  // specs: ['./Specs/Feedback.js'],
  // specs: ['./Specs/Reportabuse.js'],
  // specs: ['./Specs/Invitefriend.js'],
  // specs: ['./Specs/Addstory.js'],
  // specs: ['./Specs/Askquestion.js'],
  // specs: ['./Specs/Profile.js'],
  // specs: ['./Specs/Comments.js'],
  // specs: ['./Specs/Follow.js'],


// Report Generation

//Report 1
// onPrepare: function() {
//   jasmine.getEnv().addReporter(
//     new Jasmine2HtmlReporter({
//       savePath: 'Woovly_Report/'+Date()
//     })
//   );
// },  

// Report 2
  // onPrepare: function() {
  //   // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
  //   jasmine.getEnv().addReporter(new HtmlReporter({
  //     baseDirectory: 'Woovly_Beauty/screenshots'
  //   }).getJasmine2Reporter());
  // },


// Report 3
// onPrepare: function() {
//     var jasmineReporters = require('/usr/local/lib/node_modules/protractor/Woovly/node_modules/jasmine-reporters');
//     jasmine.getEnv().addReporter(new jasmineReporters.Jasmine2HtmlReporter(null, true, true)
//     );
// },
  //  browser.ignoreSynchronization = true,

    allScriptsTimeout: 100000,
    getPageTimeout: 100000,
  // Options to be passed to Jasmine.
  jasmineNodeOpts: {
    defaultTimeoutInterval: 1000000,
    showColors: true,
  },

};
