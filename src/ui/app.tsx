export function App(): React.JSX.Element {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header>
        <span className="app-title">SmogSense</span>
      </header>
      <main id="main">
        <h1>SmogSense</h1>
      </main>
      <footer>
        <p>
          Air quality and weather data:{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">
            Open-Meteo.com
          </a>{' '}
          (CC BY 4.0)
        </p>
      </footer>
    </>
  );
}
