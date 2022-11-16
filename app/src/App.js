import logo from "./README.avif";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Welcome to{" "}
          <code>
            <b>Building Infrastructure With CDKTF</b>
          </code>{" "}
          by <b>Softrams</b> & <b>Darrell Richards</b>.
        </p>
      </header>
    </div>
  );
}

export default App;
