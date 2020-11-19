const Application = require('spectron').Application;
const path = require('path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const electronPath = require('electron');
chai.use(chaiAsPromised);
chai.should();



var app = new Application({
    path: electronPath,
    chromeDriverArgs: ["--disable-extensions"],
    args: [path.join(__dirname, '..')],
  });


describe('Singularity app tests', function () {
  console.log(path.join(__dirname, '..'));
  beforeEach(() => {
    chaiAsPromised.transferPromiseness = app.transferPromiseness;
    return app.start();
  });

  afterEach(() => {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });


  it('Open the app', async function () {
    return app.client.waitUntilWindowLoaded().getWindowCount().should.eventually.equal(1);
  });
  
  it('Open settings', async function () {
    this.timeout(10000);
    return app.client
    .waitUntilWindowLoaded()
    .element('#accept-terms-button')
    .click()
    .element('#accept-terms-button')
    .click()
    .element('#authbar-user-avatar')
    .click()
    .element('#profile-menu-settings')
    .click()
  });

  it('Open WoW', async function () {
    this.timeout(10000);
    return app.client
    .waitUntilWindowLoaded()
    .element('#accept-terms-button')
    .click()
    .element('#accept-terms-button')
    .click()
    .element('#game-tile-1')
    .click();
  });

});