import './App.css';
import React, {Component} from "react";
import FormicaTracker from "@trlogic/tracker-web";

class App extends Component {

  render() {
    return (
      <div className="App">
        hello
      </div>
    );
  }

  componentDidMount() {
    const args = {
      serviceUrl: "https://poc.sentinel.formica.ai",
      tenantName: "master",
      apiKey: "12345"
    }
    FormicaTracker.initialize(args)
      .then(() => {
        console.log("Tracker initialized");
        //FormicaTracker.triggerCustom("testcustom1", {});
      })
      .catch((error) => console.error("Tracker could not initialized", error));
  }

}

export default App;
