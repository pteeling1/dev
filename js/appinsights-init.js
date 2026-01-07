// appinsights-init.js
function waitForAppInsights() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.Microsoft && window.Microsoft.ApplicationInsights) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

waitForAppInsights().then(() => {

const appInsights = new Microsoft.ApplicationInsights.ApplicationInsights({
  config: {
    connectionString: "InstrumentationKey=a4f5de5b-3f1f-4b0c-b290-d088e8692eb5;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=2b678a45-032d-4eb6-adf3-52f1ed6d0810"
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView({ name: "Homepage Visit" });

window.appInsights = appInsights;
})

