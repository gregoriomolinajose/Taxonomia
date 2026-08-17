const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AuthManager', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    const htmlPath = path.resolve(__dirname, '../src/Auth_UI.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract script content
    const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch ? scriptMatch[1] : '';

    dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app-container"></div></body></html>`, {
      runScripts: 'dangerously'
    });
    window = dom.window;
    document = window.document;

    // Mock global functions
    window.PresentSafe = vi.fn().mockResolvedValue();
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName) {
      const el = originalCreateElement(tagName);
      if (tagName === 'ion-loading' || tagName === 'ion-toast') {
        el.dismiss = vi.fn().mockResolvedValue();
      }
      return el;
    };
    window.DataAPI = {
      call: vi.fn().mockResolvedValue({ authorized: true, email: 'test@example.com' })
    };
    window.formatUserName = vi.fn().mockReturnValue('Test User');

    // Load the script into the DOM
    const scriptEl = document.createElement('script');
    scriptEl.textContent = scriptContent;
    document.body.appendChild(scriptEl);
  });

  it('should only execute init logic once even if called multiple times', async () => {
    // AuthManager should be on window
    const AuthManager = window.AuthManager;
    
    // Mock the DataAPI call to track invocations
    const dataApiSpy = vi.spyOn(window.DataAPI, 'call');
    
    // Call init twice concurrently or sequentially
    await AuthManager.init();
    await AuthManager.init();
    
    // It should only have called the API twice (getUserIdentity + getAppBootstrapPayload)
    expect(dataApiSpy).toHaveBeenCalledTimes(2);
  });
});
