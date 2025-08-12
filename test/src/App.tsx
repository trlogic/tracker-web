import FormicaTracker from "@trlogic/tracker-web";
import React, { useCallback, useEffect } from "react";
import "./App.css";

const TEST_EVENT_NAMES = ["testEventNameOne", "testEventNameTwo"];

export default function App() {
  const [eventName, setEventName] = React.useState(TEST_EVENT_NAMES[0]);
  const handleTriggerCustomEvent = useCallback(() => {
    console.log("Triggering custom event", eventName);
    FormicaTracker.triggerCustom(eventName, {
      name:  "test1",
      name2: "test1",
    });
  }, [eventName]);

  useEffect(() => {
    const args: FormicaTracker.TrackerInitializeArgs = {
      serviceUrl: process.env.REACT_APP_API_URL,
      tenantName: process.env.REACT_APP_TENANT,
      apiKey:     process.env.REACT_APP_API_KEY,
    };
    FormicaTracker.initialize(args)
      .then(() => {
        console.log("Tracker initialized");
      })
      .catch((error) => console.error("Tracker could not initialized", error));
  }, []);

  return (
    <main>
      <div>
        <h1>Hello, Formica Tracker!</h1>
      </div>
      <div>
        <select value={eventName} onChange={(e) => setEventName(e.target.value)}>
          {TEST_EVENT_NAMES.map((eventName) => (
            <option key={eventName} value={eventName}>
              {eventName}
            </option>
          ))}
        </select>
        <button onClick={handleTriggerCustomEvent}>Trigger Custom Event</button>

        <a href="#">Test Link</a>
      </div>
    </main>
  );
}
